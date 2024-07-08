
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import 'bootstrap/dist/css/bootstrap.min.css';


const App = () => {
  const [month, setMonth] = useState(3); 
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [barChartData, setBarChartData] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
    fetchBarChartData();
  }, [month]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('http://localhost:5050/api/transactions', {
        params: { month }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('http://localhost:5050/api/statistics', {
        params: { month }
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchBarChartData = async () => {
    try {
      const response = await axios.get('http://localhost:5050/api/bar-chart', {
        params: { month }
      });
      setBarChartData(response.data);
    } catch (error) {
      console.error('Error fetching bar chart data:', error);
    }
  };

  useEffect(() => {
    if (barChartData.length > 0) {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
      const ctx = document.getElementById('barChart').getContext('2d');
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: barChartData.map(data => data.range),
          datasets: [{
            label: 'Number of Items',
            data: barChartData.map(data => data.count),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }, [barChartData]);

  const handleNextMonth = () => {
    setMonth(prevMonth => (prevMonth % 12) + 1);
  };

  const handlePreviousMonth = () => {
    setMonth(prevMonth => (prevMonth - 1) || 12);
  };

  return (
    <div className="container">
      <h1 className="my-4">Transactions Dashboard</h1>

      {/* Month Selector */}
      <div className="">
        <label htmlFor="monthSelect">Select Month</label>
        <select 
          id="monthSelect" 
          className=""
          value={month} 
          onChange={e => setMonth(parseInt(e.target.value, 10))}
        >
          <option value="1">January</option>
          <option value="2">February</option>
          <option value="3">March</option>
          <option value="4">April</option>
          <option value="5">May</option>
          <option value="6">June</option>
          <option value="7">July</option>
          <option value="8">August</option>
          <option value="9">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>
      </div>

      
      <h2 className="my-4">Transactions Table</h2>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Price</th>
            <th>Category</th>
            <th>Sold</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <tr key={transaction._id}>
              <td>{transaction.title}</td>
              <td className="description">{transaction.description}</td>
              <td>{transaction.price}</td>
              <td>{transaction.category}</td>
              <td>{transaction.sold ? 'Yes' : 'No'}</td>
              <td>
                {transaction.image && (
                  <img src={transaction.image} alt={transaction.title} width="100" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="d-flex justify-content-between mb-4">
        <button className="btn btn-primary" onClick={handlePreviousMonth}>Previous</button>
        <button className="btn btn-primary" onClick={handleNextMonth}>Next</button>
      </div>

      <h2 className="my-4">Transactions Statistics</h2>
      <div className="card p-3 mb-4">
        <p><strong>Total Sale Amount:</strong> {statistics.totalSaleAmount}</p>
        <p><strong>Total Sold Items:</strong> {statistics.totalSoldItems}</p>
        <p><strong>Total Not Sold Items:</strong> {statistics.totalNotSoldItems}</p>
      </div>

      <h2 className="my-4">Transactions Bar Chart</h2>
      <canvas id="barChart" width="400" height="200"></canvas>
    </div>
  );
};

export default App;
