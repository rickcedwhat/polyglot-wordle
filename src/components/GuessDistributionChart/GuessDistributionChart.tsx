import { FC } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GuessDistributionChartProps {
  distribution: number[];
}

export const GuessDistributionChart: FC<GuessDistributionChartProps> = ({ distribution }) => {
  // Convert the distribution array into the format Recharts expects
  const chartData = distribution.map((count, index) => {
    if (index < 8) {
      return { name: `${index + 1}`, count }; // Guesses 1-8
    }
    return { name: 'Lost', count }; // The 9th element is losses
  });

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--mantine-color-blue-6)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
