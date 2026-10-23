import axios from "axios";
import { useState } from "react";

function CreateJob() {
  const [jobText, setJobText] = useState("");

  const handleSubmit = async () => {
    await axios.post("http://localhost:5000/api/job", {
      description: jobText
    });

    alert("Job saved!");
  };

  return (
    <div>
      <h2>Create Job</h2>
      <textarea onChange={(e) => setJobText(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default CreateJob;