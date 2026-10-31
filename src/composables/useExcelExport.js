import * as XLSX from 'xlsx';

export function useExcelExport() {
  function exportWorkoutHistory(history) {
    if (!history || history.length === 0) {
      alert('ยังไม่มีประวัติการฝึกสำหรับ Export');
      return;
    }

    const rows = [];
    history.forEach(session => {
      if (session.exercises && session.exercises.length > 0) {
        session.exercises.forEach(ex => {
          if (ex.sets && ex.sets.length > 0) {
            ex.sets.forEach(set => {
              rows.push({
                'วันที่': session.date,
                'เวลา': session.time,
                'โปรแกรมวัน': session.dayTitle,
                'ชื่อท่าฝึก': ex.name,
                'ประเภท': ex.category || '-',
                'เซ็ตที่': set.setIndex,
                'ประเภทเซ็ต': set.type,
                'เป้าหมาย': set.target,
                'น้ำหนัก (กก.)': set.weight !== undefined && set.weight !== '' ? Number(set.weight) : 0,
                'สถานะ': set.done ? 'ผ่าน ✓' : 'ข้าม'
              });
            });
          }
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 8 },  // Time
      { wch: 32 }, // Day Title
      { wch: 30 }, // Exercise Name
      { wch: 12 }, // Category
      { wch: 8 },  // Set Index
      { wch: 12 }, // Set Type
      { wch: 14 }, // Target
      { wch: 14 }, // Weight
      { wch: 10 }  // Status
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Workout History');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Jetts_Workout_Log_${dateStr}.xlsx`);
  }

  function downloadSqliteDatabase() {
    window.location.href = '/api/export/db';
  }

  return {
    exportWorkoutHistory,
    downloadSqliteDatabase
  };
}
