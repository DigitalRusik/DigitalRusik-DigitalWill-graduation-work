import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CreateWill() {
  const [recipient, setRecipient] = useState('');
  const [containers, setContainers] = useState<any[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [recipientFullName, setRecipientFullName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [isRecipientRegistered, setIsRecipientRegistered] = useState(false);
  const [userVerified, setUserVerified] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedContainerName, setSelectedContainerName] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const user = JSON.parse(storedUser);
      setUsername(user.fullName || 'Пользователь');
      const userId = user.id;
        if (userId) {
          fetchContainers(userId);
        } else {
          console.warn("Не удалось получить userId");
        }
      if (user) {
        fetchContainers(user.id);
        axios.get(`http://localhost:5000/api/auth/status/${user.email}`)
        .then(res => setUserVerified(res.data.isVerified))
        .catch(err => {
          console.error('Ошибка получения статуса подтверждения:', err);
          setUserVerified(false);
        });
      } else {
        console.error('Пользователь не найден');
      }
    }
  }, []);

  //Загрузка контейнеров для выпадающего списка
  const fetchContainers = async (userId: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/containers/user/${userId}`); 
      setContainers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки контейнеров:', err);
    }
  };
  // Ошибка, если поле email пустое
  const handleCheckRecipient = async () => {
    if (!recipient.trim()) {
      setCheckResult('Пожалуйста, введите email для проверки');
      return;
    }
    // Релизация кнопки "Проверить"
    try {
      const response = await axios.post('http://localhost:5000/api/users/check-email', {
        email: recipient,
      });
      if (response.data.exists) {
        setCheckResult('✔️ Пользователь есть в системе');
        setRecipientFullName(response.data.fullName || '');
        setIsRecipientRegistered(true);
      } else {
        setCheckResult('❌ Пользователь не зарегистрирован в системе');
        setRecipientFullName('');
        setIsRecipientRegistered(false);
      }      
    } catch (err) {
      setCheckResult('Ошибка при проверке');
    }
  };
  // Проверка заполненности при нажатии "Продолжить"
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!recipient || !selectedContainer || !unlockDate) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
  
    const today = new Date();
    const selected = new Date(unlockDate);

    // Проверка выбранной даты разблокировки на корректность
    if (selected.setHours(0,0,0,0) < today.setHours(0,0,0,0)) { 
      setError('Дата разблокировки должна быть сегодняшней или будущей');
      return;
    }
  
    try {
      const response = await axios.post('http://localhost:5000/api/users/check-email', { email: recipient });
  
      if (response.data.exists) {
        setIsRecipientRegistered(true);
        setRecipientFullName(response.data.fullName);
      } else {
        setIsRecipientRegistered(false);
        setRecipientFullName('');
      }
  
      setError('');
      setShowModal(true);
    } 
    catch (error) {
      console.error('Ошибка при проверке почты получателя:', error);
      setError('Ошибка при проверке получателя');
    }
  };
  
  // Подтверждение данных в модальном окне и отправка на backend
  const handleConfirmWill = async () => {
  setIsCreating(true);
  try {
    const unlockTime = Math.floor(new Date(unlockDate).getTime() / 1000);

    // const usersRes = await axios.get('http://localhost:5000/api/auth/users');
    // const allUsers = usersRes.data;
    // const recipientUser = allUsers.find((u: any) => u.email === recipient);

    // if (!recipientUser) {
    //   setError('Пользователь-получатель не найден');
    //   setIsCreating(false);
    //   return;
    // }


    // 1. Сначала создаём завещание в смарт-контракте
    const contractRes = await axios.post('http://localhost:5000/api/contract/create-will', {
      recipientEmail: recipient,
      dataHash: selectedContainer,
      unlockTime
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });

    const contractWillId = contractRes.data.contractWillId;

    // 2. Теперь создаём завещание в БД
    await axios.post('http://localhost:5000/api/wills', {
      recipient,
      containerId: selectedContainer,
      unlockTime,
      recipientFullName: recipientFullName || null,
      contractWillId
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });

    setIsCreating(false);
    alert('Завещание создано');
    router.push('/dashboard');
  } catch (err) {
    console.error('Ошибка при создании завещания:', err);
    setError('Ошибка при создании завещания');
    setIsCreating(false);
  }
};


  //----------------------------------------------------------------------------
  //--------------------------HTML----------------------------------------------
  //----------------------------------------------------------------------------

  return (
    <main className="page-container">
  <div className="header-bar">
    <div className="header-left">
      <Link href="/dashboard">
        <img src="/images/logo.png" alt="Логотип" className="header-logo" />
      </Link>
    </div>
    <div className="header-center">
      <h1>Создание завещания</h1>
    </div>
    <div className="header-right">
      <span>{username}</span>
    </div>
  </div>
  <div>
    <hr />
  </div>
  <div className="div-body">
    <div className="exit-button">
      <Link href="/dashboard">
        <button>
          Обратно на главную страницу
        </button>
      </Link>
    </div>
    {!userVerified ? (
      <div className="center-will">
        <p>Ваш профиль не подтверждён. Вы не можете создавать завещания.
          Пройдите верификацию, перейдя по кнопке на нужную страницу.
        </p>
        <Link href="/verification">
          <button className="verify-button">
            Пройти верификацию
          </button>
        </Link>
      </div>
    ) : (
      <p></p>
    )}

    <div className="center-will">
      {userVerified && (
        <form onSubmit={handleContinue} className="will-form">
          <div>
            <label>Адрес электронной почты получателя:</label>
            <input
              type="email"
              placeholder="Email получателя"
              className="input-field"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setCheckResult(null);
              }}
            />
            <button className="check-button" type="button" onClick={handleCheckRecipient}>
              Проверить
            </button>
            {checkResult && <p>{checkResult}</p>}
          </div>

          <div>
            <label>Выберите контейнер: </label>
            <select
              value={selectedContainer}
              onChange={(e) => {
                const selectedId = e.target.value;
                setSelectedContainer(selectedId);
                const container = containers.find((c) => String(c.id) === selectedId);
                setSelectedContainerName(container?.name || '');
              }}
            >
              <option value="">-- Выберите контейнер --</option>
              {containers.map((container) => (
                <option key={container.id} value={container.id}>
                  {container.name}
                </option>       
              ))}
            </select>
          </div>

          <div>
            <label>Дата разблокировки: </label>
            <input
              type="date"
              placeholder="Дата разблокировки"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
            />
          </div>
          <button type="submit" className="continue-button">
            Продолжить
          </button>
        </form>
      )}
      {error && <p className="error-text error-animate">{error}</p>}
    </div>
  </div>

      {/*Модальное окно подтверждения завещания */}
      <div className={`modal ${!showModal ? 'hidden' : ''}`}>
      {showModal && (
        <div className="modal-box">
          <h3 className="">Подтверждение данных завещания</h3>
          <div>
          <p><strong>ФИО получателя:</strong> 
            {isRecipientRegistered ? (
              <span>{recipientFullName}</span>
            ) : (
              <input
                placeholder="Введите ФИО получателя"
                value={recipientFullName}
                onChange={(e) => setRecipientFullName(e.target.value)}
              />
            )}
          </p>
            <p><strong>Эл. почта получателя: </strong> {recipient}</p>
            <p><strong>Контейнер: </strong> {selectedContainerName}</p>
            <p><strong>Дата разблокировки(год, месяц, день): </strong> {unlockDate}</p>
          </div>
          {!isCreating ? (
          <div>
            <button
              onClick={handleConfirmWill}
            >
              Подтвердить
            </button>
            <button
              onClick={() => setShowModal(false)}
            >
              Отмена
            </button>
          </div>
          ) : (
            <p>⏳ Идёт процесс создания завещания...</p>
          )
          }
        </div>
      )}
      </div>
    </main>
  );
}
