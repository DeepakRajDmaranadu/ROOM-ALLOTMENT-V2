import React, { useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

export default function App() {
  const [room, setRoom] = useState("");
  const [time, setTime] = useState("");
  const [course, setCourse] = useState("");
  const [studentId, setStudentId] = useState("");
  const [entries, setEntries] = useState([]);

  const handleAddEntry = () => {
    if (!room || !time || !course || !studentId) {
      alert("Please fill all fields");
      return;
    }
    setEntries([...entries, { room, time, course, studentId }]);

    const match = studentId.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = String(parseInt(match[2]) + 1).padStart(match[2].length, "0");
      setStudentId(prefix + number);
    } else {
      setStudentId("");
    }
  };

  const handleDeleteEntry = (indexToDelete) => {
    setEntries(entries.filter((_, index) => index !== indexToDelete));
  };

  const handleDownload = () => {
    const groupedByRoom = entries.reduce((acc, e) => {
      if (!acc[e.room]) acc[e.room] = [];
      acc[e.room].push(e);
      return acc;
    }, {});

    const wb = XLSX.utils.book_new();
    const sheetData = [];

    Object.keys(groupedByRoom).forEach((room) => {
      const students = groupedByRoom[room];
      const { time, course } = students[0];

      sheetData.push([`Room No: ${room}`]);
      sheetData.push([`Time: ${time}`]);
      sheetData.push([`Course: ${course}`]);
      sheetData.push([]);

      const maxRows = 10;
      const totalCols = Math.ceil(students.length / maxRows);

      const headerRow = [];
      for (let i = 0; i < totalCols; i++) {
        headerRow.push("Sl No", "Student ID");
      }
      sheetData.push(headerRow);

      for (let row = 0; row < maxRows; row++) {
        const rowData = [];
        for (let col = 0; col < totalCols; col++) {
          const idx = col * maxRows + row;
          if (idx < students.length) {
            rowData.push(idx + 1, students[idx].studentId);
          } else {
            rowData.push("", "");
          }
        }
        sheetData.push(rowData);
      }
      sheetData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Room Allotments");
    XLSX.writeFile(wb, "room_allotments.xlsx");
  };

  const groupedEntries = entries.reduce((acc, e, idx) => {
    if (!acc[e.room]) acc[e.room] = [];
    acc[e.room].push({ ...e, index: idx });
    return acc;
  }, {});

  return (
    <div className="container">
      <div className="form-container">
        <h1>Room Allotment</h1>
        <div className="form">
          <input
            type="text"
            placeholder="Room Number"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <input
            type="text"
            placeholder="Time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <input
            type="text"
            placeholder="Course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />
          <input
            type="text"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddEntry();
              }
            }}
          />
          <button onClick={handleAddEntry}>Add Entry</button>
        </div>
      </div>

      <div className="rooms-container">
        {Object.keys(groupedEntries).map((roomKey) => {
          const students = groupedEntries[roomKey];
          const { time, course } = students[0];
          const maxRows = 10;
          const totalCols = Math.ceil(students.length / maxRows);
          const columns = [];
          for (let i = 0; i < totalCols; i++) {
            columns.push(students.slice(i * maxRows, (i + 1) * maxRows));
          }

          return (
            <div className="room" key={roomKey}>
              <div className="room-header">
                <div><strong>Room No:</strong> {roomKey}</div>
                <div><strong>Time:</strong> {time}</div>
                <div><strong>Course:</strong> {course}</div>
              </div>

              <div className="table-excel">
                {columns.map((col, colIndex) => (
                  <div className="student-column" key={colIndex}>
                    <div className="table-row table-header">
                      <div className="table-cell slno-header">Sl No</div>
                      <div className="table-cell id-header">Student ID</div>
                      <div className="table-cell action-header">Action</div>
                    </div>
                    {[...Array(maxRows)].map((_, rowIndex) => {
                      const student = col[rowIndex];
                      return (
                        <div className="table-row" key={rowIndex}>
                          <div className="table-cell slno-cell">{student ? rowIndex + 1 + colIndex * maxRows : ""}</div>
                          <div className="table-cell id-cell">{student ? student.studentId : ""}</div>
                          <div className="table-cell action-cell">
                            {student && (
                              <button
                                className="delete-btn"
                                onClick={() => handleDeleteEntry(student.index)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button className="download-btn" onClick={handleDownload}>Download Excel</button>
    </div>
  );
}
