// App.jsx
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";

export default function App() {
  const [room, setRoom] = useState("");
  const [time, setTime] = useState("");
  const [course, setCourse] = useState("");
  const [studentId, setStudentId] = useState("");
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("roomEntries");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("roomEntries", JSON.stringify(entries));
  }, [entries]);

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
    const grouped = entries.reduce((acc, e) => {
      if (!acc[e.room]) acc[e.room] = {};
      if (!acc[e.room][e.course]) acc[e.room][e.course] = [];
      acc[e.room][e.course].push(e);
      return acc;
    }, {});

    const wb = XLSX.utils.book_new();
    const sheetData = [];

    Object.entries(grouped).forEach(([room, courseObj]) => {
      sheetData.push([`Room No: ${room}`]);

      Object.entries(courseObj).forEach(([course, students]) => {
        const { time } = students[0];
        sheetData.push([`Time: ${time}`]);
        sheetData.push([`Course: ${course}`]);
        sheetData.push([]);

        const maxRows = 10;
        const totalCols = Math.ceil(students.length / maxRows);
        const headerRow = [];
        for (let i = 0; i < totalCols; i++) headerRow.push("Sl No", "Student ID");
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
      sheetData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Room Allotments");
    XLSX.writeFile(wb, "room_allotments.xlsx");
  };

  const groupedEntries = entries.reduce((acc, e, idx) => {
    if (!acc[e.room]) acc[e.room] = {};
    if (!acc[e.room][e.course]) acc[e.room][e.course] = [];
    acc[e.room][e.course].push({ ...e, index: idx });
    return acc;
  }, {});

  const getRoomColorClass = (roomName) => {
    const roomIndex = Object.keys(groupedEntries).indexOf(roomName);
    const colorClasses = ["pink", "blue", "green", "orange", "purple"];
    return colorClasses[roomIndex % colorClasses.length];
  };

  return (
    <div className="container">
      <div className="form-container">
        <button
          className="clear-btn"
          onClick={() => {
            if (window.confirm("Are you sure you want to clear all entries?")) {
              localStorage.removeItem("roomEntries");
              setEntries([]);
            }
          }}
        >
          Clear All Entries
        </button>

        <h1>Room Allotment</h1>
        <div className="form">
          <input type="text" placeholder="Room Number" value={room} onChange={(e) => setRoom(e.target.value)} />
          <input type="text" placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
          <input type="text" placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
          <input
            type="text"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyDown={(e) => {
              const match = studentId.match(/^(.*?)(\d+)$/);
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddEntry();
              } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && match) {
                e.preventDefault();
                const prefix = match[1];
                let number = parseInt(match[2]);

                if (e.key === "ArrowUp") number++;
                if (e.key === "ArrowDown" && number > 0) number--;

                const newId = prefix + String(number).padStart(match[2].length, "0");
                setStudentId(newId);
              }
            }}
          />

          <button onClick={handleAddEntry}>Add Entry</button>
        </div>
      </div>

      <div className="rooms-container">
        {Object.entries(groupedEntries).map(([roomKey, courseObj]) => (
          <div className={`room ${getRoomColorClass(roomKey)}`} key={roomKey}>
            <div className="room-header">
              <h3>Room No: {roomKey}</h3>
              <p>Total Students: {Object.values(courseObj).reduce((a, arr) => a + arr.length, 0)}</p>
            </div>

            {Object.entries(courseObj).map(([course, students]) => {
              const maxRows = 10;
              const totalCols = Math.ceil(students.length / maxRows);
              const columns = Array.from({ length: totalCols }, (_, i) => students.slice(i * maxRows, (i + 1) * maxRows));

              return (
                <div key={course} className="course-block">
                  <h4>Course: {course}</h4>
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
                                  <button className="delete-btn" onClick={() => handleDeleteEntry(student.index)}>Delete</button>
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
        ))}
      </div>

      <button className="download-btn" onClick={handleDownload}>Download Excel</button>
    </div>
  );
} 