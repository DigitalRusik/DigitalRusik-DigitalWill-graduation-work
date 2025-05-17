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



  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const user = JSON.parse(storedUser);
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
      await axios.post('http://localhost:5000/api/wills', {
        recipient,
        containerId: selectedContainer,
        unlockTime,
      },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
      // После успешного создания завещания в БД
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const usersRes = await axios.get('http://localhost:5000/api/auth/users');
      const allUsers = usersRes.data;
      const recipient_email = allUsers.find((u: any) => u.email === recipient);
      const selectedRecipientEth = recipient_email?.eth_address;
      if (!recipient_email) {
        console.error('Адрес получателя не найден!');
        return;
      }
      
      await axios.post('http://localhost:5000/api/contract/create-will', {
        recipientEthAddress: selectedRecipientEth,
        dataHash: selectedContainer,
        unlockTime: Math.floor(new Date(unlockDate).getTime() / 1000),
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
      });
      setIsCreating(false);
      alert('Завещание создано');
      router.push('/dashboard');
    } catch (err) {
      console.error('Ошибка при создании завещания:', err);
      setIsCreating(false);
    }
  };

  //----------------------------------------------------------------------------
  //--------------------------HTML----------------------------------------------
  //----------------------------------------------------------------------------

  return (
    <main className="main-container">
      <div className="head-page">
        <h1>Создание завещания</h1>
      </div>
      <div>
          <hr></hr>
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
          <div>
            <p>Ваш профиль не подтверждён. Вы не можете создавать завещания.
              Пройдите верификацию, перейдя по кнопке на нужную страницу.
            </p>
            <Link href="/kyc">
                <button>
                  Пройти верификацию
                </button>
              </Link>
          </div>
        ) : (
          <p>Ваш аккаунт подтверждён! Вы можете создавать завещание.</p>
        )}

        <div className="center-will">
          {userVerified && (
            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label>Адрес электронной почты получателя:</label>
                <input
                  type="email"
                  placeholder="Email получателя"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setCheckResult(null);
                  }}
                />
                <button 
                  type="button"
                  onClick={handleCheckRecipient}
                >
                  Проверить
                </button>
                {checkResult && <p>{checkResult}</p>}
              </div>

              <div>
                <label>Выберите контейнер: </label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
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
            <button type="submit">
              Продолжить
            </button>
          </form>
          )}
          <div className="error-text">    
              {error && <div>{error}</div>}
          </div>
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
            <p><strong>Контейнер: </strong> {selectedContainer}</p>
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
