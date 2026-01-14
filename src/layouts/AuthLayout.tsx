import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-rose-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-8 shadow-xl shadow-rose-100/30">
        <Outlet />
      </div>
    </div>
  );
}
