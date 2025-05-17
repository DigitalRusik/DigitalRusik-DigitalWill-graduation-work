import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [username, setUsername] = useState('');
  const [verified, setVerified] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUsername(parsedUser.fullName || 'Пользователь');
        setVerified(parsedUser.isVerified);
      } catch (err) {
        console.error('Ошибка при парсинге пользователя:', err);
        router.push('/login');
      }
    }
  }, []);
  

  return (
    <main className="main-container">
      <div className="head-page">
        <h1>Добро пожаловать, {username}!</h1>
      </div>
      <div>
        <hr></hr>
      </div>
      <div className="div-body">
        <button
          onClick={() => {
            localStorage.removeItem('user');
            localStorage.removeItem("token");
            router.push('/login');
          }}
          className="exit-button"
        >
          Выйти
        </button>
        <div className="main-buttons">
          <Link href="/create">
            <button>
              Создать завещание
            </button>
          </Link>
        </div>
        <div className="main-buttons">
          <Link href="/containers">
            <button>
              Мои контейнеры
            </button>
          </Link>
        </div>
        <div className="main-buttons">
          <Link href="/wills">
            <button>
              Мои завещания
            </button>
          </Link>
        </div>
        <div className="main-buttons">
          {!verified && (
            <Link href="/kyc">
              <button>
                Пройти верификацию
              </button>
            </Link>
          )}
        </div>
        
      </div>
    </main>
  );
}