import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { TabBar } from '@/components/TabBar';
import { useAuthStore } from '@/store/auth.store';
import { userApi } from '@/api/user';
import { useToast } from '@/components/Toast';

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [saving, setSaving] = useState(false);

  // ProtectedRoute 已保证 token 存在，但 refreshUserInfo 可能未完成时 user 暂为旧值/null
  if (!user) return null;

  const maskedPhone = user.phone.slice(0, 3) + '****' + user.phone.slice(-4);
  const isAdmin = user.role === 'admin';

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await userApi.updateProfile({ nickname });
      useAuthStore.setState({ user: data.data! });
      showToast('资料已更新', 'success');
      setIsEditing(false);
    } catch {
      showToast('更新失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNickname(user.nickname ?? '');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-canvas pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-canvas/90 backdrop-blur-[10px] border-b border-brand-border px-4 py-3">
        <h1 className="text-[22px] font-black text-brand-dark">个人中心</h1>
      </header>

      {/* 主卡片 */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-3xl border border-brand-border p-6 flex flex-col items-center gap-3">
          <Avatar src={user.avatar} alt={user.nickname ?? user.phone} size={72} />

          {isEditing ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
                autoFocus
                placeholder="输入昵称"
                className="text-center text-[18px] font-bold border border-brand-border rounded-2xl px-3 py-2 w-full max-w-[220px] focus:outline-none focus:border-brand-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || nickname.trim().length === 0}
                  className="px-5 py-1.5 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-coral text-white text-sm font-bold disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-5 py-1.5 rounded-2xl border border-brand-border text-sm font-bold text-brand-dark"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[22px] font-black text-brand-dark">
                {user.nickname ?? `用户${user.phone.slice(-4)}`}
              </div>
              <div className="text-[13px] text-brand-muted">📱 {maskedPhone}</div>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-brand-peach text-brand-primary text-[11px] font-bold">
                  管理员
                </span>
              )}
              <button
                onClick={() => { setNickname(user.nickname ?? ''); setIsEditing(true); }}
                className="mt-2 w-full max-w-[220px] py-2.5 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-coral text-white text-sm font-bold"
              >
                编辑资料
              </button>
            </>
          )}
        </div>

        {/* 登出按钮 */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full py-3 rounded-2xl border border-brand-coral text-brand-coral text-sm font-bold bg-white"
        >
          退出登录
        </button>
      </div>

      <TabBar />
    </div>
  );
}
