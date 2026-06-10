import { useCharStore } from '../store/useCharStore';

export default function Notif() {
  const notif = useCharStore(s => s.notif);
  if (!notif) return null;
  return <div className="notif">{notif}</div>;
}
