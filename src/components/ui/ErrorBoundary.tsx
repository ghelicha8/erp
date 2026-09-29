import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

// مرز خطای سراسری: اگر بخشی از برنامه کرش کرد، به‌جای صفحه سفید، پنل خطا نشان بده
// و بقیه برنامه (سایدبار و منوها) سالم بماند.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center" dir="rtl">
          <div className="w-20 h-20 rounded-[1.75rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
            خطایی در این بخش رخ داد
          </h2>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-2">
            نگران نباشید؛ اطلاعات شما ذخیره شده است. می‌توانید دوباره تلاش کنید یا از منو بخش دیگری را باز کنید.
          </p>
          {this.state.message && (
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 max-w-lg break-words mb-6" dir="ltr">
              {this.state.message.slice(0, 200)}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-8 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            تلاش مجدد
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
