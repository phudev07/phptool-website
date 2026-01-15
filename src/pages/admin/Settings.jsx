import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Layout/Navbar';
import './Admin.css';

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState({
    downloadUrl: '',
    version: '',
    changelog: '',
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const docRef = doc(db, 'settings', 'software');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'software'), {
        ...settings,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setSaving(false);
  }

  if (!isAdmin()) {
    return (
      <div className="admin-page">
        <Navbar />
        <div className="admin-container">
          <div className="access-denied">
            <h1>⛔ Không có quyền truy cập</h1>
            <Link to="/dashboard">Về Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Navbar />

      <div className="admin-container">
        <div className="admin-header">
          <h1>⚙️ Cài đặt phần mềm</h1>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="settings-form">
            <div className="settings-card">
              <h2>📥 Link tải phần mềm</h2>
              
              <div className="form-group">
                <label>Version hiện tại</label>
                <input
                  type="text"
                  placeholder="VD: 1.0.0"
                  value={settings.version}
                  onChange={(e) => setSettings({...settings, version: e.target.value})}
                />
                <small>Tool sẽ check version này để báo cập nhật</small>
              </div>

              <div className="form-group">
                <label>Link tải (Google Drive, MediaFire...)</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={settings.downloadUrl}
                  onChange={(e) => setSettings({...settings, downloadUrl: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Changelog (tùy chọn)</label>
                <textarea
                  placeholder="- Tính năng mới...&#10;- Sửa lỗi..."
                  value={settings.changelog || ''}
                  onChange={(e) => setSettings({...settings, changelog: e.target.value})}
                  rows={4}
                />
              </div>

              {settings.updatedAt && (
                <p className="last-updated">
                  Cập nhật lần cuối: {new Date(settings.updatedAt.seconds ? settings.updatedAt.seconds * 1000 : settings.updatedAt).toLocaleString('vi-VN')}
                </p>
              )}

              <button 
                className="btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
