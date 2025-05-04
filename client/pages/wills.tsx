import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function Wills() {
  const [createdWills, setCreatedWills] = useState([]);
  const [receivedWills, setReceivedWills] = useState([]);
  const [error, setError] = useState('');
  const [userEthAddress, setUserEthAddress] = useState('');

  useEffect(() => {
    const fetchWills = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      setUserEthAddress(user.ethAddress);
      // Получение списков завещаний
      try {
        const willsRes = await axios.get(`http://localhost:5000/api/wills/${user.ethAddress}`);
        const usersRes = await axios.get('http://localhost:5000/api/auth/users');

        const users = usersRes.data;

        const created = willsRes.data.created.map((will: any) => ({
          ...will,
          recipientFullName: users.find((u: any) => u.email === will.recipient)?.fullName || 'Неизвестно',
        }));

        const received = willsRes.data.received.map((will: any) => ({
          ...will,
          ownerFullName: users.find((u: any) => u.eth_address === will.owner)?.fullName || 'Неизвестно',
        }));

        setCreatedWills(created);
        setReceivedWills(received);
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
          {createdWills.length === 0 ? (
            <p>Нет созданных завещаний</p>
          ) : (
            <ul>
              {createdWills.map((will: any) => (
                <li key={will.id}>
                  <p><strong>Наследник: </strong>{will.recipientFullName}</p>
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
          {receivedWills.length === 0 ? (
            <p>Нет завещаний</p>
          ) : (
            <ul className="ul">
              {receivedWills.map((will: any) => (
                <div key={will.id} className="will-card">
                  <p><strong>Завещатель: </strong>{will.ownerFullName}</p>
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
