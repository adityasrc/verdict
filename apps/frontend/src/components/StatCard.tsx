
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, className }) => (
    <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-body-sm font-medium text-text-secondary">{label}</CardTitle>
            <Icon className="h-4 w-4 text-text-muted shrink-0" />
        </CardHeader>
        <CardContent>
            <span className="text-2xl sm:text-3xl font-semibold block tracking-tight text-text-primary font-mono tabular-nums">
                {value}
            </span>
        </CardContent>
    </Card>
);
