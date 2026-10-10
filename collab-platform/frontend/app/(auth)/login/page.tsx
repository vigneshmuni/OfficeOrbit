'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, UserCheck, Code, Eye, ArrowRight, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/lib/toast';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER'>('TEAM_MEMBER');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    const targetEmail = (customEmail || email).trim().toLowerCase();
    const targetPassword = customPassword || password;

    if (mode === 'register' && !name.trim()) {
      showToast.error('Please enter your full name');
      return;
    }

    if (!targetEmail || !targetPassword) {
      showToast.error('Please enter email address and password');
      return;
    }

    if (mode === 'register' && targetPassword.length < 6) {
      showToast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (mode === 'register') {
        res = await api.auth.register({
          name: name.trim(),
          email: targetEmail,
          password: targetPassword,
          globalRole: selectedRole,
        });
        showToast.success(`Account created! Welcome, ${res.user.name}!`);
      } else {
        res = await api.auth.login({ email: targetEmail, password: targetPassword });
        showToast.success(`Welcome back, ${res.user.name}!`);
      }

      const token = res.accessToken || res.token;
      setAuth(res.user, token);
      router.push('/dashboard');
    } catch (err: any) {
      const rawMsg = err.response?.data?.message;
      const msg = Array.isArray(rawMsg)
        ? rawMsg.join('. ')
        : (rawMsg || 'Authentication failed. Please check your email and password.');
      showToast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showToast.info('Forgot Password: Contact system admin or use default test password Admin@123');
  };

  const testAccounts = [
    {
      role: 'Admin',
      email: 'admin@collab.dev',
      pass: 'Admin@123',
      icon: Shield,
      color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 hover:border-rose-500/60',
      badge: 'Full System Control',
    },
    {
      role: 'Project Manager',
      email: 'pm@collab.dev',
      pass: 'Admin@123',
      icon: UserCheck,
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/60',
      badge: 'Project & Team Lead',
    },
    {
      role: 'Team Member',
      email: 'dev@collab.dev',
      pass: 'Admin@123',
      icon: Code,
      color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 hover:border-indigo-500/60',
      badge: 'Task Execution & Comments',
    },
    {
      role: 'Viewer',
      email: 'viewer@collab.dev',
      pass: 'Admin@123',
      icon: Eye,
      color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-500/60',
      badge: 'Read-only Access',
    },
  ];

  const roleOptions = [
    { id: 'ADMIN', label: 'Admin', desc: 'Full System Control', icon: Shield },
    { id: 'PROJECT_MANAGER', label: 'Project Manager', desc: 'Project Lead', icon: UserCheck },
    { id: 'TEAM_MEMBER', label: 'Team Member', desc: 'Collaborator', icon: Code },
    { id: 'VIEWER', label: 'Viewer', desc: 'Read-only Access', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-600/30 mb-4">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          OfficeOrbit
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Real-time Collaborative Project Management Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-gray-900/80 backdrop-blur-xl py-8 px-6 shadow-2xl border border-gray-800 rounded-2xl sm:px-10">
          
          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-gray-950 p-1 mb-6 border border-gray-800">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign Up (Select Role)
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            {mode === 'register' && (
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@collab.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
              {mode === 'login' && (
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Role Selection on Sign Up */}
            {mode === 'register' && (
              <div className="pt-1">
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Select Your Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600/15 text-white ring-1 ring-indigo-500'
                            : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-gray-500'}`} />
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-xs font-bold text-gray-200 mt-1.5">{role.label}</p>
                        <p className="text-[10px] text-gray-500">{role.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-4"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'register' ? 'Create Account & Sign In' : 'Sign In'}
            </Button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-3 text-gray-500 font-semibold tracking-wider">
                  Quick 1-Click Role Login
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {testAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setEmail(acc.email);
                      setPassword(acc.pass);
                      handleAuth(undefined, acc.email, acc.pass);
                    }}
                    className={`p-3 rounded-xl bg-gradient-to-b ${acc.color} border text-left transition-all duration-200 hover:scale-[1.02] cursor-pointer group`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-300 group-hover:text-white" />
                      <span className="text-xs font-semibold text-gray-200">{acc.role}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 truncate">{acc.badge}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
