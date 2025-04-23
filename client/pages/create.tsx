import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CreateWill() {
  const [owner, setOwner] = useState('');
  const [recipient, setRecipient] = useState('');
  const [dataHash, setDataHash] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      try {
        const parsedUser = JSON.parse(storedUser);
        setOwner(parsedUser.email); // или parsedUser.id, если нужно
      } catch (err) {
        console.error('Ошибка при парсинге пользователя:', err);
        router.push('/login');
      }
    }
  }, []);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unlockTime = Math.floor(new Date(unlockDate).getTime() / 1000);
    await axios.post('http://localhost:5000/api/wills', {
      owner,
      recipient,
      dataHash,
      unlockTime,
    });
    alert('Завещание создано');
  };

  return (
    <main className="main-container">
      <div className="head-page">
        <h2>Создание завещания</h2>
      </div>
      <hr></hr>
      <div className="exit-button">
        <Link href="/dashboard">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
            Обратно на главную страницу
          </button>
        </Link>
      </div>

      <div className="center-will">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded p-2"
            type="text"
            placeholder="Адрес владельца"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            type="text"
            placeholder="Адрес получателя"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            type="text"
            placeholder="Хэш зашифрованных данных"
            value={dataHash}
            onChange={(e) => setDataHash(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            type="date"
            placeholder="Дата разблокировки"
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-xl">
            Сохранить завещание
          </button>
        </form>
      </div>
    </main>
  );
}