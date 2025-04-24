import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CreateWill() {
  const [ethAddress, setEthAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [dataHash, setDataHash] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const user = JSON.parse(storedUser);
      if (user.ethAddress) {
        setEthAddress(user.ethAddress);
      } else {
        setEthAddress('Адрес не найден');
      }
    }
  }, []);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unlockTime = Math.floor(new Date(unlockDate).getTime() / 1000);
    await axios.post('http://localhost:5000/api/wills', {
      owner: ethAddress,
      recipient,
      dataHash,
      unlockTime,
    });
    alert('Завещание создано');
  };

  const handleCheckRecipient = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/users/check-email', {
        email: recipient,
      });

      if (response.data.exists) {
        setCheckResult('✔️ Пользователь есть в системе');
      } else {
        setCheckResult('❌ Пользователь не зарегистрирован в системе');
      }
    } catch (err) {
      setCheckResult('Ошибка при проверке');
    }
  };

  return (
    <main className="main-container">
      <div className="head-page">
        <h1>Создание завещания</h1>
      </div>
      <hr></hr>
      <div className="exit-button">
        <Link href="/dashboard">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
            Обратно на главную страницу
          </button>
        </Link>
        <p className="mb-4">Ваш адрес: {ethAddress}</p>
      </div>

      <div className="center-will">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className=""
            >
              Проверить
            </button>
            {checkResult && <p className="text-sm mt-1">{checkResult}</p>}
          </div>
          <div>
            <label>Хэш зашифрованных данных: </label>
            <input
              className="w-full border rounded p-2"
              type="text"
              placeholder="Хэш зашифрованных данных"
              value={dataHash}
              onChange={(e) => setDataHash(e.target.value)}
            />
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
            Сохранить завещание
          </button>
        </form>
      </div>
    </main>
  );
}