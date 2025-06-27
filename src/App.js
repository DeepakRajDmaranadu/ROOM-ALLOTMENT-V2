import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
  const [editIndex, setEditIndex] = useState(null);

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

  const handleInsertBelow = (index) => {
    const entryToCopy = entries[index];
    const newEntry = { ...entryToCopy, studentId: "" };

    setEntries((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newEntry);
      // Set the new index as editable after insert
      setEditIndex(index + 1);
      return updated;
    });
  };


  const handleDownload = async () => {
    const grouped = entries.reduce((acc, e) => {
      if (!acc[e.room]) acc[e.room] = {};
      if (!acc[e.room][e.course]) acc[e.room][e.course] = { subject: e.subject, time: e.time, students: [] };
      acc[e.room][e.course].students.push(e);
      return acc;
    }, {});

    const sheetData = [];
    const merges = [];

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

      sheetData.push([], [], []);

      const courseNameRow = sheetData.length - 3;
      const subjectRow = sheetData.length - 2;
      const headerRow = sheetData.length - 1;

      let colIndex = 0;

      courseColumnsInfo.forEach(({ course, students, colCount }) => {
        sheetData[courseNameRow][colIndex] = `${course} (${courseObj[course].time})`;
        merges.push({ s: { r: courseNameRow, c: colIndex }, e: { r: courseNameRow, c: colIndex + colCount - 1 } });

        sheetData[subjectRow][colIndex] = courseObj[course].subject || "";
        merges.push({ s: { r: subjectRow, c: colIndex }, e: { r: subjectRow, c: colIndex + colCount - 1 } });

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
            const excelRow = headerRow + 1 + row;
            const slNoCol = colIndex + block * 2;
            const regNoCol = slNoCol + 1;

            if (studentIndex < students.length) {
              const slNo = studentIndex + 1;
              const regNo = students[studentIndex].studentId;

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
        merges.push({ s: { r: sheetData.length, c: colIndex }, e: { r: sheetData.length, c: colIndex + colCount - 1 } });
        colIndex += colCount;
      });

      sheetData.push(countRow);

      if (totalColumns > 0) {
        merges.push({ s: { r: roomRowIndex, c: 0 }, e: { r: roomRowIndex, c: totalColumns - 1 } });
      }

      sheetData.push([]);
    });

    // ExcelJS to generate and format the Excel file
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Room Allotments");

    sheetData.forEach((row, rowIndex) => {
      const excelRow = sheet.getRow(rowIndex + 1);
      row.forEach((cell, colIndex) => {
        const excelCell = excelRow.getCell(colIndex + 1);
        excelCell.value = cell;

        const isRegisterOrSL = cell === "REGISTER NUMBER" || cell === "SL NO";
        const isStudentId = typeof cell === "string" && /^[A-Z0-9]+$/.test(cell);

        const isBold =
          !isRegisterOrSL &&
          !(/^\d+$/.test(cell)) && // not SL NO
          !(isStudentId && rowIndex >= 5); // don't bold student IDs

        excelCell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: isRegisterOrSL,
        };

        excelCell.font = {
          size: 20,
          bold: isBold,
        };

        // ✅ Always apply border to make it look full (even empty cells)
        excelCell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      excelRow.commit();
    });

    merges.forEach((merge) => {
      const startCell = sheet.getCell(merge.s.r + 1, merge.s.c + 1);
      const endCell = sheet.getCell(merge.e.r + 1, merge.e.c + 1);
      sheet.mergeCells(`${startCell.address}:${endCell.address}`);
    });

    // Set column widths: SL NO → 7, Register No → 27
    const maxCols = Math.max(...sheetData.map((row) => row.length));
    for (let i = 0; i < maxCols; i++) {
      sheet.getColumn(i + 1).width = i % 2 === 0 ? 7 : 27;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "room_allotments.xlsx");
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
          <input type="text" placeholder="ROOM NUMBER" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase().replace(/[^A-Z 0-9-:]/g, ''))} />
          <input type="text" placeholder="TIME" value={time} onChange={(e) => setTime(e.target.value.toUpperCase().replace(/[^A-Z - 0-9-:]/g, ''))} />
          <input type="text" placeholder="COURSE" value={course} onChange={(e) => setCourse(e.target.value.toUpperCase().replace(/[^A-Z - 0-9-]/g, ''))} />
          <input type="text" placeholder="SUBJECT" value={subject} onChange={(e) => setSubject(e.target.value.toUpperCase().replace(/[^A-Z - 0-9-]/g, ''))} />
          <input
            type="text"
            placeholder="STUDENT ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => {
              const match = e.currentTarget.value.match(/^(.*?)(\d+)$/);
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddEntry();
              } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && match) {
                e.preventDefault();
                const prefix = match[1];
                let number = parseInt(match[2], 10);
                if (e.key === "ArrowUp") number++;
                if (e.key === "ArrowDown" && number > 0) number--;
                setStudentId(prefix + String(number).padStart(match[2].length, "0"));
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
                          <div className="table-cell action-header">Actions</div>
                        </div>
                        {[...Array(maxRows)].map((_, rowIndex) => {
                          const student = col[rowIndex];
                          if (!student) {
                            return (
                              <div className="table-row" key={rowIndex}>
                                <div className="table-cell slno-cell"></div>
                                <div className="table-cell id-cell"></div>
                                <div className="table-cell action-cell"></div>
                              </div>
                            );
                          }

                          return (
                            <div className="table-row" key={rowIndex}>
                              <div className="table-cell slno-cell">{rowIndex + 1 + colIndex * maxRows}</div>
                              <div className="table-cell id-cell">
                                {editIndex === student.index ? (
                                  <input
                                    value={student.studentId}
                                    onChange={(e) =>
                                      setEntries((prev) =>
                                        prev.map((entry, i) =>
                                          i === student.index ? { ...entry, studentId: e.target.value } : entry
                                        )
                                      )
                                    }
                                  />
                                ) : (
                                  <input style={{ background: "#253348", color: "", fontSize: "15px", fontWeight: "" }} value={student.studentId} disabled />
                                )}
                              </div>
                              <div className="table-cell action-cell">
                                {editIndex === student.index ? (
                                  <button
                                    className="save-btn"
                                    onClick={() => setEditIndex(null)}
                                  >
                                    Save
                                  </button>
                                ) : (
                                  student.studentId && (
                                    <button
                                      className="edit-btn"
                                      onClick={() => setEditIndex(student.index)}
                                    >
                                      E
                                    </button>
                                  )
                                )}
                                <button className="delete-btn" onClick={() => handleDeleteEntry(student.index)}>
                                  X
                                </button>
                                <button className="add-btn" onClick={() => handleInsertBelow(student.index)}>
                                  +
                                </button>
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
