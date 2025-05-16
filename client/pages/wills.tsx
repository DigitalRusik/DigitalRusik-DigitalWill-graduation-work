import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Will {
  id: number;
  owner: string;
  recipient: string;
  data_hash: string;
  unlock_time: number;
  created_at: string;
  recipient_full_name?: string;
  container_id: number;
}

export default function Wills() {
  const [createdWills, setCreatedWills] = useState<Will[]>([]);
  const [receivedWills, setReceivedWills] = useState<Will[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWills = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!storedUser || !token) return;

      // Получение списков завещаний
      try {
        const res = await axios.get('http://localhost:5000/api/wills/myWills', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCreatedWills(res.data.sent);
      setReceivedWills(res.data.received);
      console.log(res.data)
      } catch (err) {
        console.error('Ошибка при получении завещаний:', err);
        setError('Не удалось загрузить данные завещаний');
      }
    };

    fetchWills();
  }, []);

  const isUnlocked = (unlockTimestamp: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const unlockDate = new Date(unlockTimestamp * 1000);
    unlockDate.setHours(0, 0, 0, 0);
  
    return unlockDate <= today;
  };
  
  //Скачивание завещания
  const handleDownload = async (willId: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/containers/download-will/${willId}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'will.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Ошибка при скачивании завещания:', error);
      alert('Ошибка при скачивании завещания');
    }
  };

  return (
    <main className="main-container">
      <div className="head-page">
        <h1>Мои завещания</h1>
      </div>
      <div>
      <hr></hr>
      </div>
      <div className="div-body">
        <div className="exit-button">
          <Link href="/dashboard">
            <button>
              Назад на главную
            </button>
          </Link>
        </div>

        {error && <div className="error-text">{error}</div>}

        {/* Созданные завещания */}
        <section>
          <h2>Созданные завещания</h2>
          {Array.isArray(createdWills) && createdWills.length === 0 ? (
            <p>Нет созданных завещаний</p>
          ) : (
            <ul>
              {Array.isArray(createdWills) && createdWills.map((will: any) => (
                <li key={will.id}>
                  <p><strong>Наследник: </strong>{will.recipient_name}</p>
                  <p><strong>Контейнер: </strong>{will.data_hash}</p>
                  <p><strong>Дата разблокировки: </strong> {new Date(will.unlock_time * 1000).toLocaleDateString('ru-RU')}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr></hr>
        <hr></hr>
        <hr></hr>

        {/* Завещания, оставленные пользователю */}
        <section>
          <h2>Завещания, оставленные вам</h2>
          {Array.isArray(receivedWills) && receivedWills.length === 0 ? (
            <p>Нет завещаний</p>
          ) : (
            <ul className="ul">
              {Array.isArray(receivedWills) && receivedWills.map((will: any) => (
                <div key={will.id} className="will-card">
                  <p><strong>Завещатель: </strong>{will.owner_name}</p>
                  <p><strong>Контейнер: </strong>{will.data_hash}</p>
                  <p><strong>Дата разблокировки: </strong> {new Date(will.unlock_time * 1000).toLocaleDateString('ru-RU')}</p>
                  {isUnlocked(will.unlock_time) ? (
                    <button onClick={() => handleDownload(will.id)} className="download-button">
                      Получить завещание
                    </button>
                  ) : (
                    <p className="locked-text">Завещание пока не доступно</p>
                  )}
                </div>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
