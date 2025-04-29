import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Wills() {
  const [createdWills, setCreatedWills] = useState([]);
  const [receivedWills, setReceivedWills] = useState([]);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [UserEthAddress, setUserEthAddress] = useState([]); // Пришлось добавить, возможно ОШИБКА БУДЕТ 

  useEffect(() => {
    const fetchWills = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;
  
      const user = JSON.parse(storedUser);
      setUserEthAddress(user.ethAddress);

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
      }
    };
  
    fetchWills();
  }, []);
  

  const handleDownload = async (willId: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/containers/download-will/${willId}`, {
        responseType: 'blob',
      });
  
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'container.zip');
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
            <h1 className="text-2xl font-bold mb-6">Мои завещания</h1>
        </div>
        <div>
            <hr></hr>
        </div>
        <div className='div-body'>
            <div className="exit-button">
                <Link href="/dashboard">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                    Назад на главную
                </button>
                </Link>
            </div>
            <div className="error-text">
                {error && <div className="error-text">{error}</div>}
            </div>
            <section className="w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">Созданные завещания</h2>
              {createdWills.length === 0 ? (
                <p>Нет созданных завещаний</p>
              ) : (
                <ul>
                  {createdWills.map((will: any) => (
                    <li key={will.id} className="mb-2 border p-2 rounded">
                      <p>Получатель: {will.recipientFullName}</p>
                      <p>Контейнер: {will.container_name}</p>
                      <p>Дата разблокировки: {new Date(will.unlock_date).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <hr></hr>
            <hr></hr>
            <hr></hr>
            <section className="w-full max-w-2xl mt-8">
              <h2 className="text-xl font-semibold mb-2">Завещания, оставленные вам</h2>
              {receivedWills.length === 0 ? (
                <p>Нет завещаний</p>
              ) : (
                <ul>
                  {receivedWills.map((will: any) => (
                    <li key={will.id} className="mb-2 border p-2 rounded">
                      <p>Отправитель: {will.ownerFullName}</p>
                      <p>Контейнер: {will.container_name}</p>
                      <p>Дата разблокировки: {new Date(will.unlock_date).toLocaleDateString()}</p>
                      <button
                        onClick={() => handleDownload(will.id)}
                        className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
                      >
                        Получить завещание
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
      </div>
    </main>
  );
}
