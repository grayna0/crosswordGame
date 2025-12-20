/* eslint-disable no-restricted-globals */
/* eslint-disable-next-line */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  CheckCircle, 
  Info,
  Keyboard,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { CROSSWORD_DATA, CROSSWORD_DATA_2 } from '../../constant';
// import './container.scss';

// --- LOGIC HELPER: GRID CALCULATION ---
const DATA_SOURCE = CROSSWORD_DATA_2;
const KEYWORD = DATA_SOURCE.map(d => d.answer[d.keyIndex]).join('');

const calculateGridLayout = (data) => {
    // 1. Tìm vị trí cột trụ (Pivot Column) dựa trên keyIndex lớn nhất
    // Ví dụ: RESPONSIBILITY có keyIndex = 8 (chữ B), vậy cột trụ tối thiểu là index 8
    const pivotCol = Math.max(...data.map(d => d.keyIndex));
    
    // 2. Tính tổng số cột cần thiết
    // Cần tìm từ dài nhất về phía bên phải cột trụ
    let maxRightExtend = 0;
    data.forEach(item => {
        const charsAfterPivot = item.answer.length - 1 - item.keyIndex;
        if (charsAfterPivot > maxRightExtend) maxRightExtend = charsAfterPivot;
    });

    const totalCols = pivotCol + 1 + maxRightExtend;
    const totalRows = data.length;

    // 3. Tạo bản đồ lưới (Grid Map)
    // Mỗi ô sẽ chứa thông tin ký tự hoặc null nếu là ô trống
    const map = Array(totalRows).fill(null).map(() => Array(totalCols).fill(null));
    
    data.forEach((item, rowIndex) => {
        // Tính cột bắt đầu của từ này để chữ cái khóa khớp với pivotCol
        const startCol = pivotCol - item.keyIndex;
        
        for (let i = 0; i < item.answer.length; i++) {
            map[rowIndex][startCol + i] = {
                char: item.answer[i],
                isKey: i === item.keyIndex, // Đánh dấu đây là ô thuộc từ khóa dọc
                rowId: rowIndex,
                originalIndex: i
            };
        }
    });

    return { map, totalRows, totalCols, pivotCol };
};

const { map: GRID_MAP, totalRows, totalCols, pivotCol } = calculateGridLayout(DATA_SOURCE);

// --- COMPONENTS ---

export default function Page2() {
  // State
  const [userGrid, setUserGrid] = useState(() => {
    const grid = Array(totalRows).fill(null).map(() => Array(totalCols).fill(''));
    DATA_SOURCE.forEach((item, rIndex) => {
        if (item.default && item.default.length === 2) {
             const [idx, char] = item.default;
             const startCol = pivotCol - item.keyIndex;
             const targetCol = startCol + idx;
             if (targetCol >= 0 && targetCol < totalCols) {
                 grid[rIndex][targetCol] = char;
             }
        }
    });
    return grid;
  });
  
  const [activeCell, setActiveCell] = useState({ row: 0, col: -1 }); // Col sẽ được set lại khi mount
  const [isSolved, setIsSolved] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [checkMode, setCheckMode] = useState(false);
    const [troll, setTroll] = useState(false);
  
  
  const [showPrankButton, setShowPrankButton] = useState(false);
  const [showPrankModal, setShowPrankModal] = useState(false);
  
  const inputRefs = useRef({}); 
  const containerRef = useRef(null);

  // --- EFFECTS ---

  // Init: Set focus vào ô đầu tiên của hàng 1
  useEffect(() => {
    const firstRowItem = DATA_SOURCE[0];
    const firstCol = pivotCol - firstRowItem.keyIndex;
    setActiveCell({ row: 0, col: firstCol });
  }, []);

  // Timer
  useEffect(() => {
    if (isSolved) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, isSolved]);

  // Auto Focus Input
  useEffect(() => {
    const key = `${activeCell.row}-${activeCell.col}`;
    if (inputRefs.current[key]) {
      inputRefs.current[key].focus();
    }
  }, [activeCell]);

  // --- LOGIC HANDLERS ---

  const activeQuestion = useMemo(() => {
      return DATA_SOURCE[activeCell.row]?.question || "";
  }, [activeCell.row]);

  // Check logic for Prank (Row 5)
  useEffect(() => {
    if (totalRows < 5) return;
    
    let allFiveCorrect = true;
    for (let r = 0; r < 5; r++) {
        const item = DATA_SOURCE[r];
        const startCol = pivotCol - item.keyIndex;
        const userRowStr = userGrid[r].slice(startCol, startCol + item.answer.length).join('').toUpperCase();
        if (userRowStr !== item.answer) {
            allFiveCorrect = false;
            break;
        }
    }

    if (allFiveCorrect && !showPrankButton) {
        setShowPrankButton(true);
    }
  }, [userGrid, totalRows, pivotCol, showPrankButton]);

  const handleInputChange = (value, row, col) => {
    if (isSolved) return;
    
    const upperChar = value.toUpperCase();
    if (!/^[A-Z]$/.test(upperChar) && value !== '') return;

    const newGrid = [...userGrid];
    newGrid[row][col] = upperChar;
    setUserGrid(newGrid);

    // Auto Advance logic
    if (upperChar !== '') {
      moveFocus(row, col, 1);
    }
  };

  const moveFocus = (r, c, step) => {
    let nextCol = c + step;
    
    // Tìm ô hợp lệ tiếp theo trong cùng hàng
    // Nếu đi ra ngoài biên hoặc gặp ô null -> dừng hoặc chuyển hàng
    while (nextCol >= 0 && nextCol < totalCols) {
        if (GRID_MAP[r][nextCol] !== null) {
            setActiveCell({ row: r, col: nextCol });
            return;
        }
        nextCol += step;
    }
    
    // Nếu hết hàng (đi tới cuối bên phải), nhảy xuống hàng dưới
    if (step > 0 && r < totalRows - 1) {
        const nextRow = r + 1;
        const nextItem = DATA_SOURCE[nextRow];
        const nextStartCol = pivotCol - nextItem.keyIndex;
        setActiveCell({ row: nextRow, col: nextStartCol });
    }
  };

  const handleKeyDown = (e, row, col) => {
    if (isSolved) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newGrid = [...userGrid];
      if (userGrid[row][col] !== '') {
        // Xóa ô hiện tại
        newGrid[row][col] = '';
        setUserGrid(newGrid);
      } else {
        // Lùi lại và xóa ô trước
        let prevCol = col - 1;
        while (prevCol >= 0) {
            if (GRID_MAP[row][prevCol] !== null) {
                setActiveCell({ row, col: prevCol });
                const gridUpdate = [...userGrid];
                gridUpdate[row][prevCol] = '';
                setUserGrid(gridUpdate);
                return;
            }
            prevCol--;
        }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(row, col, 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(row, col, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (row < totalRows - 1) {
          // Cố gắng giữ cột dọc, nếu không thì về ô start của hàng dưới
          const nextRow = row + 1;
          if (GRID_MAP[nextRow][col]) {
              setActiveCell({ row: nextRow, col });
          } else {
             const nextStart = pivotCol - DATA_SOURCE[nextRow].keyIndex;
             setActiveCell({ row: nextRow, col: nextStart });
          }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (row > 0) {
          const prevRow = row - 1;
          if (GRID_MAP[prevRow][col]) {
              setActiveCell({ row: prevRow, col });
          } else {
             const prevStart = pivotCol - DATA_SOURCE[prevRow].keyIndex;
             setActiveCell({ row: prevRow, col: prevStart });
          }
      }
    }
  };

  const checkSolution = () => {
    let isAllCorrect = true;
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const cellData = GRID_MAP[r][c];
        if (cellData) {
          if (userGrid[r][c] !== cellData.char) {
            isAllCorrect = false;
          }
        }
      }
    }
    
    if (isAllCorrect) {
      setIsSolved(true);
    } else {
      setCheckMode(true);
      setTimeout(() => setCheckMode(false), 2000);
    }
  };

  const performReset = () => {
        const grid = Array(totalRows).fill(null).map(() => Array(totalCols).fill(''));
        DATA_SOURCE.forEach((item, rIndex) => {
            if (item.default && item.default.length === 2) {
                 const [idx, char] = item.default;
                 const startCol = pivotCol - item.keyIndex;
                 const targetCol = startCol + idx;
                 if (targetCol >= 0 && targetCol < totalCols) {
                     grid[rIndex][targetCol] = char;
                 }
            }
        });
        setUserGrid(grid);
        setIsSolved(false);
        setCheckMode(false);
        setShowPrankButton(false);
        setShowPrankModal(false);
        const firstRowItem = DATA_SOURCE[0];
        setActiveCell({ row: 0, col: pivotCol - firstRowItem.keyIndex });
  };

  const resetGame = () => {
    if(window.confirm("Chơi lại từ đầu?")) {
        performReset();
    }
  };

  const handlePrankClick = () => {
      setShowPrankModal(true);
  };

  const handlePrankConfirm = () => {
      performReset();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- STYLES ---

  const getCellStyle = (r, c) => {
      const cellData = GRID_MAP[r][c];
      if (!cellData) return "invisible border-none"; // Ẩn hoàn toàn ô trống

      const isActive = activeCell.row === r && activeCell.col === c;
      const isKeyColumn = c === pivotCol; // Cột từ khóa FOTOBER
      
      let baseClass = "relative flex items-center justify-center text-sm sm:text-base md:text-lg font-bold uppercase transition-all duration-150 cursor-pointer select-none rounded ";
      
      // -- Determine Colors --
      let bg = "bg-white";
      let border = "border-slate-300";
      let text = "text-slate-800";
      let shadow = "shadow-sm";
      let extra = "";

      // 1. Base State (Normal & Key Column)
      if (isKeyColumn) {
          bg = "bg-yellow-500"; 
          border = "border-yellow-400";
          text = "text-yellow-700";
          shadow = "shadow-md shadow-yellow-100";
          extra = "font-extrabold ";
      }

      // 2. Active State (Focus)
      if (isActive) {
          extra += "ring-2 ring-blue-500 z-20 transform scale-105 ";
          if (!isKeyColumn) bg = "bg-blue-50";
      }

      // 3. Validation Logic (Check Mode & Solved)
      const isCorrect = userGrid[r][c] === cellData.char;
      const hasInput = userGrid[r][c] !== '';
      
      if (isSolved) {
           // Khi hoàn thành
           if (isKeyColumn) {
               // KeyIndex -> Vàng rực
               bg = "bg-gradient-to-br from-yellow-600 to-amber-700";
               border = "border-yellow-700";
               text = "text-white";
               shadow = "shadow-lg shadow-yellow-700";
               extra += " animate-pulse";
           } else {
               // Các chữ khác -> Xanh lá
               bg = "bg-green-500";
               text = "text-green-700";
               border = "border-green-500";
           }
      } else if (checkMode && hasInput) {
           // Khi đang kiểm tra
           if (isCorrect) {
               if (isKeyColumn) {
                   // Đúng & Là Key -> Vàng
                   bg = "bg-yellow-200";
                   text = "text-yellow-700";
                   border = "border-yellow-500";
               } else {
                   // Đúng & Thường -> Xanh
                   bg = "bg-green-200";
                   text = "text-green-700";
                   border = "border-green-500";
               }
           } else {
               // Sai -> Đỏ
               bg = "bg-red-200";
               text = "text-red-700";
               border = "border-red-400";
           }
      }

      return `${baseClass} ${bg} ${border} ${text} ${shadow} ${extra}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900 shadow-amber-500/50 shadow-sm">
               <Trophy size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FINDING THE LIGHT</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="bg-slate-800  rounded text-amber-400 font-mono font-bold tracking-wider">FOTOBER</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-[10px] text-slate-400 uppercase tracking-widest">Thời gian</span>
               <span className="font-mono text-xl font-bold text-amber-400">{formatTime(elapsedTime)}</span>
            </div>
            <button 
                onClick={checkSolution}
                disabled={isSolved}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold transition-all shadow-lg active:scale-95 ${
                    isSolved 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'
                }`}
            >
              {isSolved ? <CheckCircle size={18} /> : <Lightbulb size={18} />}
              {isSolved ? "Hoàn tất" : "Kiểm tra"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-5xl mx-auto w-full  flex flex-col items-center">
        
        {/* CURRENT QUESTION BOX */}
        <div className="w-full max-w-3xl bg-white border-l-4 border-amber-500 p-5 mb-8 rounded-r-xl shadow-sm animate-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-start mb-2">
                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                    <Info size={12}/> Hàng {activeCell.row + 1}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Keyboard size={12}/> Nhập đáp án
                </span>
            </div>
            <div className="text-xl md:text-2xl font-medium text-slate-800 leading-snug">
                {activeQuestion}
            </div>
        </div>

        {/* GAME AREA */}
        <div className="relative w-full overflow-x-auto pb-8 flex justify-center ">
            <div 
                className="grid gap-y-1.5 gap-x-0.5 p-2 sm:p-4 bg-slate-100 rounded-xl shadow-inner"
                style={{
                    gridTemplateColumns: window.innerWidth < 640 
                        ? `repeat(${totalCols}, minmax(18px, 25px))` 
                        : `repeat(${totalCols}, minmax(25px, 32px))`, 
                }}
                ref={containerRef}
            >
                {/* RENDER GRID */}
                {GRID_MAP.map((row, rIndex) => (
                    row.map((cellData, cIndex) => {
                        const key = `${rIndex}-${cIndex}`;
                        return (
                            <div 
                                key={key}
                                className={`aspect-square ${getCellStyle(rIndex, cIndex)}`}
                                onClick={() => cellData && setActiveCell({ row: rIndex, col: cIndex })}
                            >
                                {cellData && (
                                    <>
                                        {/* Row Number (Chỉ hiện ở ô đầu tiên của mỗi hàng) */}
                                        {cIndex === (pivotCol - DATA_SOURCE[rIndex].keyIndex) && (
                                            <div className="absolute  -left-6 sm:-left-4md:-left-6 top-0 -translate-y-1/2 w-5 sm:w-6 text-right ">
                                                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-400 bg-slate-100 px-1 sm:px-1.5 py-0.5 rounded-md bg-transparent">
                                                    {rIndex + 1}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Input */}
                                        <input 
                                            ref={el => inputRefs.current[key] = el}
                                            type="text"
                                            className="w-full h-full bg-transparent text-center focus:outline-none caret-transparent cursor-pointer p-0 font-sans"
                                            value={userGrid[rIndex][cIndex]}
                                            maxLength={1}
                                            onChange={(e) => handleInputChange(e.target.value, rIndex, cIndex)}
                                            onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)}
                                            autoComplete="off"
                                        />
                                    </>
                                )}
                            </div>
                        );
                    })
                ))}
            </div>
        </div>

        {/* KEYWORD HINT */}
        {/* <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Lightbulb size={16} className="text-amber-500"/>
            <span>Chữ <span className="font-bold text-red-500">màu đỏ</span> theo cột dọc ghép thành: <span className="font-mono font-bold text-red-600">FOTOBER</span></span>
        </div> */}

        {/* CONTROLS */}
        <div className="flex gap-4">
             <button 
                onClick={resetGame}
                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
                <RotateCcw size={16} /> Chơi lại từ đầu
            </button>
        </div>

       
             </main>
             
      

      {/* SUCCESS MODAL */}
      {isSolved && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500"></div>
                  
                  <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
                      <Trophy size={40} strokeWidth={2} />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Xuất sắc!</h2>
                  <p className="text-slate-500 text-sm mb-6">Bạn đã mở khóa từ bí ẩn</p>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
                       <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Từ khóa</span>
                       <span className="block text-3xl font-black text-amber-500 tracking-[0.2em]">{KEYWORD}</span>
                  </div>

                  <div className="flex justify-between text-sm mb-6 px-2">
                       <span className="text-slate-500">Thời gian:</span>
                       <span className="font-bold text-slate-800">{formatTime(elapsedTime)}</span>
                  </div>

                  <button 
                    onClick={resetGame}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                      <RotateCcw size={18} /> Chơi lại
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}