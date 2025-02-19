import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/employees');
        setEmployees(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch employees');
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Active Employees</h1>
      <table>
        <thead>
          <tr>
            {employees.length > 0 && 
              Object.keys(employees[0]).map(key => (
                <th key={key}>{key}</th>
              ))
            }
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => (
            <tr key={index}>
              {Object.values(employee).map((value, i) => (
                <td key={i}>{value?.toString()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;