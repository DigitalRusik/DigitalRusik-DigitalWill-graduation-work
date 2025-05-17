import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';


interface KycRequest {
  id: number;
  user_id: number;
  document_path: string;
  status: string;
  email: string;
  first_name: string;
  last_name: string;
  patronymic: string;
}

export default function KycAdminPage() {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
      const isAdmin = localStorage.getItem('admin');
      if (isAdmin !== 'admin') {
        router.push('/admin/loginAdmin');
      }
    axios.get('http://localhost:5000/api/kyc/requests')
      .then(res => setRequests(res.data))
      .catch(() => setError('Ошибка при загрузке заявок'));
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await axios.post(`http://localhost:5000/api/kyc/approve/${id}`);
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    } catch {
      setError('Ошибка при подтверждении заявки');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await axios.post(`http://localhost:5000/api/kyc/reject/${id}`);
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    } catch {
      setError('Ошибка при отклонении заявки');
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('admin');
      router.push('/admin/loginAdmin');
  };


  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Заявки на верификацию</h1>
      <button
        onClick={handleLogout}
        className="bg-gray-500 text-white px-4 py-2 rounded"
      >
        Выйти
      </button>
      {error && <p className="error-text">{error}</p>}
      {requests.map((req) => (
        <div key={req.id} className="border p-4 mb-4 rounded shadow">
          <p><b>Пользователь:</b> {req.last_name} {req.first_name} {req.patronymic} ({req.email})</p>
          <p><b>Статус:</b> {req.status}</p>
          <a href={`http://localhost:5000/${req.document_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
            Просмотреть документ
          </a>
          {req.status === 'pending' && (
            <div>
              <button
                onClick={() => handleApprove(req.id)}
                className="ml-4 bg-green-600 text-white px-4 py-1 rounded">
                Подтвердить
              </button>
              <button
                onClick={() => handleReject(req.id)}
                className="ml-2 bg-red-600 text-white px-4 py-1 rounded">
                Отклонить
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
