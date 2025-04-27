import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Wills() {
  const [user, setUser] = useState<any>(null);
  const [createdWills, setCreatedWills] = useState([]);
  const [receivedWills, setReceivedWills] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      fetchWills(parsed);
    }
  }, []);

  const fetchWills = async (userData: any) => {
    try {
      const created = await axios.get(`http://localhost:5000/api/wills/created/${userData.id}`);
      setCreatedWills(created.data);

      const received = await axios.get(`http://localhost:5000/api/wills/received/${userData.email}`);
      setReceivedWills(received.data);
    } catch (err) {
      console.error('Ошибка при загрузке завещаний:', err);
    }
  };

  const handleAccessWill = async (will: any) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/containers/by-name/${encodeURIComponent(will.data_hash)}`
      );
  
      const files = res.data.files;
      if (!files.length) {
        alert('Файлы контейнера не найдены.');
        return;
      }
  
      for (const file of files) {
        const downloadRes = await axios.post(
          `http://localhost:5000/api/containers/download/${file.container_id}`,
          {
            fileName: file.name,
          },
          { responseType: 'blob' }
        );
        const blob = new Blob([downloadRes.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      alert('Файлы загружены!');
    } catch (err) {
        setError(err);
      console.error('Ошибка при получении завещания:', err);
      alert('Ошибка при получении завещания');
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
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Созданные вами завещания:</h2>
                {createdWills.length > 0 ? (
                <ul className="space-y-2">
                    {createdWills.map((will: any) => (
                    <li key={will.id} className="border p-4 rounded">
                        <p><strong>Получатель:</strong> {will.recipient}</p>
                        <p><strong>Контейнер:</strong> {will.data_hash}</p>
                        <p><strong>Дата разблокировки:</strong> {new Date(will.unlock_time * 1000).toLocaleDateString()}</p>
                    </li>
                    ))}
                </ul>
                ) : (
                <p>Нет созданных завещаний.</p>
                )}
            </div>
            <hr></hr>
            <hr></hr>
            <hr></hr>
            <div>
                <h2 className="text-xl font-semibold mb-3">Завещания, оставленные вам:</h2>
                {receivedWills.length > 0 ? (
                <ul className="space-y-2">
                    {receivedWills.map((will: any) => {
                    const isUnlocked = will.unlock_time * 1000 <= Date.now();
                    return (
                        <li key={will.id} className="border p-4 rounded flex justify-between items-center">
                        <div>
                            <p><strong>От кого:</strong> {will.owner}</p>
                            <p><strong>Контейнер:</strong> {will.data_hash}</p>
                            <p><strong>Дата разблокировки:</strong> {new Date(will.unlock_time * 1000).toLocaleDateString()}</p>
                        </div>
                        {isUnlocked ? (
                            <button
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                            onClick={() => handleAccessWill(will)}
                            >
                            Получить завещание
                            </button>
                        ) : (
                            <p className="text-gray-500 text-sm">Завещание пока недоступно</p>
                        )}
                        </li>
                    );
                    })}
                </ul>
                ) : (
                <p>Нет завещаний, оставленных вам.</p>
                )}
            </div>
      </div>
    </main>
  );
}
