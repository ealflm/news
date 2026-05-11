import { Newspaper } from 'lucide-react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Newspaper className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Đăng nhập admin</h1>
          <p className="text-sm text-muted-fg">Nhập thông tin để vào trang quản lý</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
