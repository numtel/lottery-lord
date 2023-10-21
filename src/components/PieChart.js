import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from 'react-chartjs-2';
import { isAddress } from 'viem';

const F16 = 0xffffffffffffffff;
const PieChart = ({ data }) => {
  ChartJS.register(ArcElement, Tooltip, Legend);
  // Extract labels and percentages from the data
  const labels = data.map((item, index) => item[0] === 0 ? 'Random Winner' : isAddress(item[0]) ? item[0].slice(0, 6) + '...' + item[0].slice(-4) : item[0]);
  const percentages = data.map(item => item[1] / F16 * 100);

  // Define the chart data
  const chartData = {
    labels: labels,
    datasets: [
      {
        data: percentages,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          // Add more colors as needed
        ],
      },
    ],
  };

  return (
    <div className="pie-chart">
      <Pie data={chartData} />
    </div>
  );
};

export default PieChart;

