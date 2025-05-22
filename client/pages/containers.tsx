import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';


export default function Containers() {
  const [user, setUser] = useState<any>(null);
  const [containerName, setContainerName] = useState('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [totalSizeMB, setTotalSizeMB] = useState(0);
  const [error, setError] = useState('');
  const [containers, setContainers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'delete' | 'view' | null>(null);
  const [password, setPassword] = useState('');
  const [passwordForDownloads, setPasswordForDownloads] = useState('');
  const [targetContainerId, setTargetContainerId] = useState<number | null>(null);
  const [targetFileName, setTargetFileName] = useState('');
  const [unlockedContainers, setUnlockedContainers] = useState<number[]>([]);
  const [modalError, setModalError] = useState("");
  const [username, setUsername] = useState('');


  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(stored);
      setUsername(parsed.fullName || 'Пользователь');
      setUser(parsed);
      fetchContainers(parsed.id);
    }
  }, []);

  useEffect(() => {
    const size =
      (mainFile?.size || 0) +
      additionalFiles.reduce((acc, f) => acc + f.size, 0);
    setTotalSizeMB(size / 1024 / 1024);
  }, [mainFile, additionalFiles]);
  // =====Загрузка списка контейнеров=====
  const fetchContainers = async (userId: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/containers/user/${userId}`);
      setContainers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки контейнеров:', err);
    }
  };
  // =====Проверка файлов=====
  const handleMainFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const valid = ['pdf', 'doc', 'docx'];
      if (!valid.includes(ext!)) {
        setError('Основной файл должен быть .pdf, .doc или .docx');
        setMainFile(null);
        return;
      }
    }

    setError('');
    setMainFile(file);
  };

  const handleAdditionalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 20) {
      setError('Можно загрузить не более 20 дополнительных файлов.');
      return;
    }

    setError('');
    setAdditionalFiles(selected);
  };
  // =====Создание контейнера=====
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!containerName.trim()) {
      setError('Пожалуйста, укажите имя контейнера.');
      return;
    }
    if (!mainFile) {
      setError('Необходимо загрузить основной файл.');
      return;
    }
    if (totalSizeMB > 50) {
      setError('Общий размер файлов не должен превышать 50 МБ.');
      return;
    }

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('containerName', containerName);
    formData.append('mainFile', mainFile);
    additionalFiles.forEach((file) => {
      formData.append('extraFiles', file);
    });
    try {
      await axios.post('http://localhost:5000/api/containers', formData);
      alert('Контейнер создан');
      setContainerName('');
      setMainFile(null);
      setAdditionalFiles([]);
      fetchContainers(user.id);
    } catch (err) {
      console.error(err);
      setError('Ошибка при создании контейнера');
    }
  };
  // =====Модальное окно с паролем=====
  const openPasswordModal = (mode: 'delete' | 'view', containerId: number, fileName?: string) => {
    setModalMode(mode);
    setTargetContainerId(containerId);
    if (fileName) setTargetFileName(fileName);
    setPassword('');
    setError('');
    setModalError("");
    setShowModal(true);
  };
  // =====Режим модального окна и вывод ошибки о неверном пароле в modalError=====
  const handleModalConfirm = async () => {
    if (!password || !user || targetContainerId === null) return;

    try {
      const verify = await axios.post('http://localhost:5000/api/containers/verify-password', {
        userId: user.id,
        password,
      });

      if (!verify.data.success) {
        setModalError('Ошибка: неверный пароль');
        return;
      }

      if (modalMode === 'delete') {
        await axios.delete(`http://localhost:5000/api/containers/${targetContainerId}`);
        setContainers(containers.filter(c => c.id !== targetContainerId));
        alert('Контейнер удалён');
      }

      if (modalMode === 'view') { 
        setUnlockedContainers((prev) => [...prev, targetContainerId!]);
        setPasswordForDownloads(password); 
      }

      setShowModal(false);
      setPassword('');
      setTargetFileName('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setModalError('Ошибка: неверный пароль');
      } else {
        console.error(err);
        setModalError('Ошибка при выполнении действия');
      }
    }
  };

  const handleDownload = async (containerId: number, fileName: string, pwd?: string) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/containers/download/${containerId}`,
        {
          userId: user.id,
          password: pwd || passwordForDownloads,
          fileName,
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Ошибка при скачивании файла:', err);
      setError('Ошибка при скачивании');
    }
  };

  //----------------------------------------------------------------------------
  //--------------------------HTML----------------------------------------------
  //----------------------------------------------------------------------------
  return (
    <main className="page-container">
  <div className="header-bar">
    <div className="header-left">
      <Link href="/dashboard">
        <img src="/images/logo.png" alt="Логотип" className="header-logo" />
      </Link>
    </div>
    <div className="header-center">
      <h1>Контейнеры с данными</h1>
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
          Обратно на главную страницу
        </button>
      </Link>
    </div>
    <form onSubmit={handleSubmit} className="container-form">
      <input
        type="text"
        placeholder="Название контейнера"
        className="input-field"
        value={containerName}
        onChange={(e) => setContainerName(e.target.value)}
      />
      <div>
        <label><strong>Основной файл (обязательный):</strong></label>
        <p>Это должно быть завещание в формате <strong>.pdf</strong>, <strong>.doc </strong>
         или <strong>.docx</strong></p>
        <input
          type="file"
          className="select-field"
          accept=".pdf,.doc,.docx"
          onChange={handleMainFileChange}
          required
        />
      </div>
      <div>
        <label><strong>Дополнительные файлы (необязательно):</strong></label>
      </div>
      <input type="file" className="select-field" multiple onChange={handleAdditionalChange} />
      <div>
        Общий размер: {totalSizeMB.toFixed(2)} МБ (максимум 50 МБ, 20 шт.)
      </div>
      <div className="main-buttons">
        <button type="submit" className="continue-button">
          Создать контейнер
        </button>
      </div>
      <div className={`error ${showModal ? 'hidden' : ''}`}>
        {error && <div className="error-text error-animate">{error}</div>}
      </div>
    </form>

    <div className="hr-padding">
      <hr />
      <hr />
      <hr />
    </div>

    <div>
      <div>
        <strong>Внимание! </strong>Удаление контейнера приведёт к удалению всех завещаний,
        в которых он имеется
      </div>
      <h2>Ваши контейнеры:</h2>
      {containers.map(container => (
        <div key={container.id} className="container-entry">
          <p><strong>Название:</strong> {container.name}</p>
          <p><strong>Создан:</strong> {new Date(container.created_at).toLocaleString()}</p>
          {unlockedContainers.includes(container.id) ? (
            <ul>
              {JSON.parse(container.file_path).map((file: any) => (
                <li key={file.name}>
                  <span>{file.name}</span>
                  <button className="simple-button" onClick={() => handleDownload(container.id, file.name)}>
                    Скачать
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <button className="simple-button" onClick={() => openPasswordModal('view', container.id)}>
              Показать содержимое
            </button>
          )}
          <button className="simple-button" onClick={() => openPasswordModal('delete', container.id)}>
            Удалить контейнер
          </button>
        </div>
      ))}
    </div>
  </div>
      <div className={`modal ${!showModal ? 'hidden' : ''}`}>
        {showModal && (
          <div className="modal-box">
            <div>
              <div>
                <span>🔒</span>
                <h3>
                  {modalMode === 'delete' ? 'Удаление контейнера' : 'Просмотр содержимого'}
                </h3>
              </div>

              <p>Введите пароль для подтверждения действия.</p>

              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {modalError && <div className="error-text">{modalError}</div>}

              <div className="modal-buttons">
                <button
                  onClick={handleModalConfirm}
                >
                  Подтвердить
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setPassword('');
                    setError('');
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
