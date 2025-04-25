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
  const [modalMode, setModalMode] = useState<'delete' | 'download' | null>(null);
  const [password, setPassword] = useState('');
  const [targetContainerId, setTargetContainerId] = useState<number | null>(null);
  const [targetFileName, setTargetFileName] = useState('');

  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/');
    } else {
      const parsed = JSON.parse(stored);
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

  const fetchContainers = async (userId: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/containers/${userId}`);
      setContainers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки контейнеров:', err);
    }
  };

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

  const openPasswordModal = (mode: 'delete' | 'download', containerId: number, fileName?: string) => {
    setModalMode(mode);
    setTargetContainerId(containerId);
    if (fileName) setTargetFileName(fileName);
    setPassword('');
    setError('');
    setShowModal(true);
  };

  const handleModalConfirm = async () => {
    if (!password || !user || targetContainerId === null) return;

    try {
      const verify = await axios.post('http://localhost:5000/api/containers/verify-password', {
        userId: user.id,
        password,
      });

      if (!verify.data.success) {
        setError('Ошибка: неверный пароль');
        return;
      }

      if (modalMode === 'delete') {
        await axios.delete(`http://localhost:5000/api/containers/${targetContainerId}`);
        setContainers(containers.filter(c => c.id !== targetContainerId));
        //alert('Контейнер удалён');
      }

      if (modalMode === 'download') {
        const response = await axios.post(
          `http://localhost:5000/api/containers/download/${targetContainerId}`,
          {
            userId: user.id,
            password,
            fileName: targetFileName,
          },
          { responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', targetFileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setShowModal(false);
      setPassword('');
      setTargetFileName('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Ошибка: неверный пароль');
      } else {
        console.error(err);
        setError('Ошибка при выполнении действия');
      }
    }
  };
  //----------------------------------------------------------------------------
  //--------------------------HTML----------------------------------------------
  //----------------------------------------------------------------------------
  return (
    <main className="main-container">
        <div className="head-page">
            <h1>Зашифрованные контейнеры</h1>
        </div>
        <div>
          <hr></hr>
        </div>
        <div className="div-body">
          <div className="exit-button">
              <Link href="/dashboard">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                      Обратно на главную страницу
                  </button>
              </Link>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <input
              type="text"
              className="border p-2 w-full rounded"
              placeholder="Название контейнера"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
            />
          <div>
            <label className="block mb-1 font-semibold">Основной файл (обязательный):</label>
            <p className="text-sm mb-1 text-gray-600">
              Это должно быть завещание в формате .pdf, .doc или .docx
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleMainFileChange}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Дополнительные файлы (необязательно):</label>
            <p className="text-sm mb-1 text-gray-600">Максимум 20 файлов</p>
            <input type="file" multiple onChange={handleAdditionalChange} />
          </div>

          <div className="text-sm text-gray-700">
            Общий размер: {totalSizeMB.toFixed(2)} МБ (максимум 50 МБ)
          </div>

          {error && <div className="error-text">{error}</div>}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Создать контейнер
          </button>
        </form>

        <div>
          <h2 className="text-xl font-semibold mb-2">Ваши контейнеры:</h2>
          {containers.map(container => (
          <div key={container.id} className="border p-4 rounded mb-3">
            <p><strong>Название:</strong> {container.name}</p>
            <p><strong>Создан:</strong> {new Date(container.created_at).toLocaleString()}</p>
            <p><strong>Файлы:</strong></p>
          <ul className="pl-4">
            {JSON.parse(container.file_path).map((file: any) => (
              <li key={file.name} className="text-sm flex justify-between items-center gap-4">
                <span>{file.name}</span>
                <button
                  className="text-blue-600 underline"
                  onClick={() => openPasswordModal('download', container.id, file.name)}
                >
                  Скачать
                </button>
              </li>
            ))}
          </ul>
          <button
            className="text-red-600 mt-2 underline"
            onClick={() => openPasswordModal('delete', container.id)}
          >
            Удалить контейнер
          </button>
        </div>
      ))}
      </div>
      </div>
      <div className={`modal ${!showModal ? 'hidden' : ''}`}>
        {showModal && (
          <div className="modal-box">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔒</span>
                <h3 className="text-lg font-semibold">
                  {modalMode === 'delete' ? 'Удаление контейнера' : 'Скачивание файла'}
                </h3>
              </div>

              <p className="text-sm mb-2 text-gray-600">Введите пароль для подтверждения действия.</p>

              <input
                type="password"
                placeholder="Пароль"
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <div className="error-text">{error}</div>}

              <div className="modal-buttons">
                <button
                  onClick={handleModalConfirm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
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
