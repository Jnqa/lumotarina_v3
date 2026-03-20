import { Outlet } from 'react-router-dom'
import BottomNav from '../shared/BottomNav'
import './MainLayout.css'

export default function MainLayout() {
  return (
    <div className="main-layout">
      <div className="main-content">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}