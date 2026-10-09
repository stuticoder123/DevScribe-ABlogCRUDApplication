import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';
import { extractErrorMessage } from '../services/api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Avatar, Button, Input, Textarea } from '../components/ui';
import { AVATAR_PRESETS } from '../utils/formatters';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useDocumentMeta({
    title: 'Profile Settings — DevScribe',
  });

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [github, setGithub] = useState(user?.social_links?.github || '');
  const [website, setWebsite] = useState(user?.social_links?.website || '');
  const [xLink, setXLink] = useState(user?.social_links?.x || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio);
      setAvatar(user.avatar);
      setGithub(user.social_links?.github || '');
      setWebsite(user.social_links?.website || '');
      setXLink(user.social_links?.x || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showToast('Name must be at least 2 characters.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await userService.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
        social_links: {
          github: github.trim(),
          website: website.trim(),
          x: xLink.trim(),
        },
      });
      if (res.data) {
        updateCurrentUser(res.data);
      }
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Profile & Workspace Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Customize your public developer portfolio and workspace appearance.
          </p>
        </div>

        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/author/${user.username}`)}
          >
            <span>View Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6"
      >
        <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <Avatar src={avatar} name={name || 'User'} size="xl" />
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {name || user?.name}
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              @{user?.username} · {user?.email}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAvatar(preset.url)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                    avatar === preset.url
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Use {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            required
          />
          <Input
            label="Avatar URL"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="/src/assets/images/..."
          />
        </div>

        <Textarea
          label="Developer Bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell readers about your engineering focus, open-source projects, and technical stack..."
        />

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Portfolio & Social Links
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="GitHub URL"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/username"
            />
            <Input
              label="Personal Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourdomain.dev"
            />
            <Input
              label="X / Twitter URL"
              value={xLink}
              onChange={(e) => setXLink(e.target.value)}
              placeholder="https://x.com/username"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Profile Changes
          </Button>
        </div>
      </form>

      {/* Appearance Theme Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Workspace Theme Preference
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose between crisp neutral light mode or high-contrast dark slate mode.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );
};
