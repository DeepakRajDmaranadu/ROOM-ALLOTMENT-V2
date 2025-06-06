// App.jsx
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";

export default function App() {
  const [room, setRoom] = useState("");
  const [time, setTime] = useState("");
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [studentId, setStudentId] = useState("");
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("roomEntries");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("roomEntries", JSON.stringify(entries));
  }, [entries]);

  const handleAddEntry = () => {
    if (!room || !time || !course || !subject || !studentId) {
      alert("Please fill all fields");
      return;
    }

    setEntries((prev) => [
      ...prev,
      { room, time, course, subject, studentId }
    ]);

    const match = studentId.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = String(parseInt(match[2], 10) + 1).padStart(match[2].length, "0");
      setStudentId(prefix + number);
    } else {
      setStudentId("");
    }
  };

  const handleDeleteEntry = (indexToDelete) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleDownload = () => {
    const grouped = entries.reduce((acc, e) => {
      if (!acc[e.room]) acc[e.room] = {};
      if (!acc[e.room][e.course]) acc[e.room][e.course] = { subject: e.subject, time: e.time, students: [] };
      acc[e.room][e.course].students.push(e);
      return acc;
    }, {});

    const wb = XLSX.utils.book_new();
    const sheetData = [];
    const merges = [];
    // const wsCellStyles = {};

    Object.entries(grouped).forEach(([room, courseObj]) => {
      const courses = Object.entries(courseObj);

      let totalColumns = 0;
      const courseColumnsInfo = courses.map(([course, { students }]) => {
        const neededColumns = Math.ceil(students.length / 10);
        const colCount = neededColumns * 2;
        totalColumns += colCount;
        return { course, students, colCount, neededColumns };
      });

      sheetData.push([`ROOM-${room}`]);
      const roomRowIndex = sheetData.length - 1;

      sheetData.push([]);
      sheetData.push([]);
      sheetData.push([]);

      const courseNameRow = sheetData.length - 3;
      const subjectRow = sheetData.length - 2;
      const headerRow = sheetData.length - 1;

      let colIndex = 0;

      courseColumnsInfo.forEach(({ course, students, colCount }) => {
        sheetData[courseNameRow][colIndex] = `${course} (${courseObj[course].time})`;
        merges.push({
          s: { r: courseNameRow, c: colIndex },
          e: { r: courseNameRow, c: colIndex + colCount - 1 }
        });

        sheetData[subjectRow][colIndex] = courseObj[course].subject || "";
        merges.push({
          s: { r: subjectRow, c: colIndex },
          e: { r: subjectRow, c: colIndex + colCount - 1 }
        });

        for (let block = 0; block < colCount / 2; block++) {
          const slNoCol = colIndex + block * 2;
          const regNoCol = slNoCol + 1;
          sheetData[headerRow][slNoCol] = "SL NO";
          sheetData[headerRow][regNoCol] = "REGISTER NUMBER";
        }

        colIndex += colCount;
      });

      const maxRows = 10;

      for (let i = 0; i < maxRows; i++) {
        sheetData.push(Array(totalColumns).fill(""));
      }

      colIndex = 0;
      courseColumnsInfo.forEach(({ students, colCount, neededColumns }) => {
        for (let block = 0; block < neededColumns; block++) {
          for (let row = 0; row < maxRows; row++) {
            const studentIndex = block * maxRows + row;
            if (studentIndex < students.length) {
              const slNo = studentIndex + 1;
              const regNo = students[studentIndex].studentId;

              const excelRow = headerRow + 1 + row;

              const slNoCol = colIndex + block * 2;
              const regNoCol = slNoCol + 1;

              sheetData[excelRow][slNoCol] = slNo;
              sheetData[excelRow][regNoCol] = regNo;
            }
          }
        }
        colIndex += colCount;
      });

      const countRow = Array(totalColumns).fill("");
      colIndex = 0;
      courseColumnsInfo.forEach(({ students, colCount }) => {
        countRow[colIndex] = `COUNT - ${students.length}`;
        merges.push({
          s: { r: sheetData.length, c: colIndex },
          e: { r: sheetData.length, c: colIndex + colCount - 1 }
        });
        colIndex += colCount;
      });

      sheetData.push(countRow);

      if (totalColumns > 0) {
        merges.push({
          s: { r: roomRowIndex, c: 0 },
          e: { r: roomRowIndex, c: totalColumns - 1 }
        });
      }

      sheetData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!merges"] = merges;

    const maxCols = Math.max(...sheetData.map(row => row.length));
    ws["!cols"] = Array(maxCols).fill(null).map((_, i) => ({
      wch: i % 2 === 0 ? 6 : 20
    }));

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

        <h1>ROOM ALLOTMENT</h1>
        <div className="form">
          <input type="text" placeholder="Room Number" value={room} onChange={(e) => setRoom(e.target.value)} />
          <input type="text" placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
          <input type="text" placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
          <input type="text" placeholder="SUBJECT" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <input
            type="text"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyDown={(e) => {
              const currentId = e.currentTarget.value;
              const match = currentId.match(/^(.*?)(\d+)$/);
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddEntry();
              } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && match) {
                e.preventDefault();
                const prefix = match[1];
                let number = parseInt(match[2], 10);

                if (e.key === "ArrowUp") number++;
                if (e.key === "ArrowDown" && number > 0) number--;

                const newId = prefix + String(number).padStart(match[2].length, "0");
                setStudentId(newId);
              }
            }}
          />

          <button onClick={handleAddEntry} disabled={!room || !time || !course || !subject || !studentId}>
            Add Entry
          </button>
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
                                  <button className="delete-btn" onClick={() => handleDeleteEntry(student.index)}>
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
        ))}
      </div>

      <button className="download-btn" onClick={handleDownload}>
        Download Excel
      </button>
    </div>
  );
}
