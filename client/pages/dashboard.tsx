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
    <main className="page-container">
      <div className="header-bar">
        <div className="header-left">
          <Link href="/dashboard">
            <img src="/images/logo.png" alt="Логотип" className="header-logo" />
          </Link>
        </div>
        <div className="header-center">
          <h1>Главная</h1>
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
          <button
            onClick={() => {
              localStorage.removeItem('user');
              localStorage.removeItem("token");
              router.push('/login');
            }}
          >Выйти</button>
        </div>
        
        <div className="dashboard-buttons">
          <Link href="/create">
            <button>
              Создать завещание
            </button>
          </Link>
        </div>
        <div className="dashboard-buttons">
          <Link href="/containers">
            <button>
              Мои контейнеры
            </button>
          </Link>
        </div>
        <div className="dashboard-buttons">
          <Link href="/wills">
            <button>
              Мои завещания
            </button>
          </Link>
        </div>
        <div className="dashboard-buttons">
          {!verified && (
            <Link href="/verification">
              <button className="verify-button">
                Пройти верификацию
              </button>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}