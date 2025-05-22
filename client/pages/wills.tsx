import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  const [showModal, setShowModal] = useState(false);
  const [selectedWillId, setSelectedWillId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [executedFlags, setExecutedFlags] = useState<{ [id: number]: boolean }>({});
  const router = useRouter();
  const [username, setUsername] = useState('');


  useEffect(() => {
    const fetchWills = async () => {
      const storedUser = localStorage.getItem('user');
      const parsed = JSON.parse(storedUser);
      setUsername(parsed.fullName || 'Пользователь');
      const token = localStorage.getItem('token');
      if (!storedUser || !token) {
        router.push('/login');
      };

      try {
        const res = await axios.get('http://localhost:5000/api/wills/myWills', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCreatedWills(res.data.sent);
        setReceivedWills(res.data.received);

        const updatedFlags: { [id: number]: boolean } = {};
        for (const will of res.data.received) {
          if (will.contract_will_id != null) {
            try {
              const execRes = await axios.get(`http://localhost:5000/api/contract/is-executed/${will.owner}/${will.contract_will_id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                }
              });
              updatedFlags[will.id] = execRes.data.executed;
            } catch (e) {
              console.error('Ошибка при проверке исполнения завещания:', e);
            }
          }
        }
        setExecutedFlags(updatedFlags);
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
  
  //Скачивание файлов завещания
  const confirmDownload = async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (!password || !selectedWillId || !user.id) {
        setModalError('Введите пароль');
        return;
      }

      try {
        const verifyRes = await axios.post('http://localhost:5000/api/containers/verify-password', {
          userId: user.id,
          password,
        });

        if (verifyRes.data.success) {
          const response = await axios.get(`http://localhost:5000/api/containers/download-will/${selectedWillId}`, {
            responseType: 'blob',
            headers: {
              Authorization: `Bearer ${token}`,
            }
          });
          const blob = new Blob([response.data]);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', 'will.zip');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setShowModal(false);
        }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка при проверке пароля';
      setModalError(msg);
    }
  };

  //Открытие модального окна
  const openModal = (willId: number) => {
    setSelectedWillId(willId);
    setPassword('');
    setModalError('');
    setShowModal(true);
  };



  return (
    <main className="page-container">
  <div className="header-bar">
    <div className="header-left">
      <Link href="/dashboard">
        <img src="/images/logo.png" alt="Логотип" className="header-logo" />
      </Link>
    </div>
    <div className="header-center">
      <h1>Мои завещания</h1>
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
      <Link href="/dashboard">
        <button>
          Назад на главную
        </button>
      </Link>
    </div>

    {error && <div className="error-text error-animate">{error}</div>}

    {/* Созданные завещания */}
    <section>
      {Array.isArray(createdWills) && createdWills.length === 0 ? (
        <p></p>
      ) : (
        <ul>
          <h2 className="text-margin">Созданные завещания:</h2>
          {Array.isArray(createdWills) && createdWills.map((will: any) => (
            <div key={will.id} className="will-entry">
              <p><strong>Наследник: </strong>{will.recipient_name}</p>
              <p><strong>Контейнер: </strong>{will.data_hash}</p>
              <p><strong>Дата разблокировки: </strong> {new Date(will.unlock_time * 1000).toLocaleDateString('ru-RU')}</p>
            </div>
          ))}
          <hr />
          <hr />
          <hr />
        </ul>
      )}
    </section>

    {/* Завещания, оставленные пользователю */}
    <section>
          <h2 className="text-margin">Завещания, оставленные вам:</h2>
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
                    executedFlags[will.id] ? (
                      <button className="download-button-inactive" disabled>
                        Завещание уже исполнено
                      </button>
                    ) : (
                      <button onClick={() => openModal(will.id)} className="download-button">
                        Получить завещание
                      </button>
                    )
                  ) : (
                    <p className="locked-text">Завещание пока не доступно</p>
                  )}
                </div>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className={`modal ${!showModal ? 'hidden' : ''}`}>
        {showModal && (
          <div className="modal-box">
            <h2>Подтверждение</h2>
            <p>
              ⚠️ Завещание может быть скачано только <b>один раз</b>. Для продолжения введите
              пароль.
            </p>
            <input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {modalError && <p className="error-text">{modalError}</p>}
            <div className="modal-buttons">
              <button onClick={() => setShowModal(false)}>Отмена</button>
              <button onClick={confirmDownload}>Скачать</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
