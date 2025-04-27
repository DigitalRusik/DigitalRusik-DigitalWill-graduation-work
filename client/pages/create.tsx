import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CreateWill() {
  const [ethAddress, setEthAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [containers, setContainers] = useState<any[]>([]); // 🔥 новое
  const [selectedContainer, setSelectedContainer] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [recipientFullName, setRecipientFullName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [isRecipientRegistered, setIsRecipientRegistered] = useState(false);


  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const user = JSON.parse(storedUser);
      if (user.ethAddress) {
        setEthAddress(user.ethAddress);
        fetchContainers(user.id); // 🔥 новое
      } else {
        setEthAddress('Адрес не найден');
      }
    }
  }, []);

  const fetchContainers = async (userId: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/containers/${userId}`);
      setContainers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки контейнеров:', err);
    }
  };

  const handleCheckRecipient = async () => {
    if (!recipient.trim()) {
      setCheckResult('Пожалуйста, введите email для проверки');
      return;
    }

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

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !selectedContainer || !unlockDate) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(unlockDate);

    if (selected < today) {
      setError('Дата разблокировки должна быть сегодняшней или будущей');
      return;
    }

    setError('');
    setShowModal(true);
  };

  const handleConfirmWill = async () => {
    try {
      const unlockTime = Math.floor(new Date(unlockDate).getTime() / 1000);
      await axios.post('http://localhost:5000/api/wills', {
        owner: ethAddress,
        recipient,
        dataHash: selectedContainer,
        unlockTime,
      });

      alert('Завещание создано');
      router.push('/dashboard');
    } catch (err) {
      console.error('Ошибка при создании завещания:', err);
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
            <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
              Обратно на главную страницу
            </button>
          </Link>
          <p className="mb-4">Ваш адрес: {ethAddress}</p>
        </div>

        <div className="center-will">
          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className="block mb-1">Адрес электронной почты получателя:</label>
              <input
                className="flex-1 border rounded p-2"
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
                className="ml-2 bg-gray-300 px-4 py-2 rounded"
              >
                Проверить
              </button>
              {checkResult && <p className="text-sm mt-1">{checkResult}</p>}
            </div>

            <div>
              <label>Выберите контейнер: </label>
              <select
                className="w-full border rounded p-2"
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
              >
                <option value="">-- Выберите контейнер --</option>
                {containers.map((container) => (
                  <option key={container.id} value={container.name}>
                    {container.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Дата разблокировки: </label>
              <input
                className="w-full border rounded p-2"
                type="date"
                placeholder="Дата разблокировки"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
              />
            </div> 
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-xl">
              Продолжить
            </button>
          </form>
          <div className="error-text">    
              {error && <div className="text-red-600 font-medium">{error}</div>}
          </div>
        </div>
      </div>

      {/*Модалка подтверждения завещания */}
      <div className={`modal ${!showModal ? 'hidden' : ''}`}>
      {showModal && (
        <div className="modal-box">
          <h3 className="">Подтверждение данных завещания</h3>
          <div className="space-y-2">
          <p><strong>ФИО получателя:</strong> 
            {isRecipientRegistered ? (
              <span className="block mt-1">{recipientFullName}</span>
            ) : (
              <input
                className="w-full border rounded p-2 mt-1"
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
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={handleConfirmWill}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Подтвердить
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
