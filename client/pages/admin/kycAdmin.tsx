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
    <div>
      <h1>Заявки на верификацию</h1>
      <button
        onClick={handleLogout}
      >
        Выйти
      </button>
      {error && <p className="error-text">{error}</p>}
      {requests.map((req) => (
        <div key={req.id}>
          <p><b>Пользователь:</b> {req.last_name} {req.first_name} {req.patronymic} ({req.email})</p>
          <p><b>Статус:</b> {req.status}</p>
          <a href={`http://localhost:5000/${req.document_path}`} target="_blank" rel="noopener noreferrer">
            Просмотреть документ
          </a>
          {req.status === 'pending' && (
            <div>
              <button
                onClick={() => handleApprove(req.id)}>
                Подтвердить
              </button>
              <button
                onClick={() => handleReject(req.id)}>
                Отклонить
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
