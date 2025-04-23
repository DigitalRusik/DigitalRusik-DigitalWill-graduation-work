import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUsername(parsedUser.fullName || 'Пользователь');
      } catch (err) {
        console.error('Ошибка при парсинге пользователя:', err);
        router.push('/login');
      }
    }
  }, []);
  

  return (
    <main className="main-container">
      <div className="head-page">
      <h1 className="text-2xl font-semibold mb-6">Добро пожаловать, {username}!</h1>
      </div>
      <hr></hr>
      <button
        onClick={() => {
          localStorage.removeItem('user');
          router.push('/login');
        }}
        className="exit-button"
      >
        Выйти
      </button>
      <div className="head-page">
        <Link href="/create">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
            Создать завещание
          </button>
        </Link>
      </div>
    </main>
  );
}