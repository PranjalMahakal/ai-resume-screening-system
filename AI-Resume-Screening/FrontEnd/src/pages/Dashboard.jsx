import axios from "axios";
import { useEffect, useState } from "react";

function Dashboard() {
  const [data, setData] = useState([]);

  const fetchResults = async () => {
    const res = await axios.get("http://localhost:5000/api/upload");
    setData(res.data);
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>

      {data.map((item, index) => (
        <div key={index}>
          <p>Name: {item.name}</p>
          <p>Skills: {item.skills}</p>
          <p>Score: {item.score}</p>
          <p>Missing: {item.missingSkills.join(", ")}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default Dashboard;