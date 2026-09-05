import { useAppSelector } from '../app/store';
import { selectCurrentUser } from '../features/auth/authSlice';
import { TeacherDashboard } from '../components/TeacherDashboard';
import { StudentDashboard } from '../components/StudentDashboard';

const Dashboard = () => {
  const user = useAppSelector(selectCurrentUser);
  return user?.role === 'TEACHER' ? <TeacherDashboard /> : <StudentDashboard />;
};

export default Dashboard;
