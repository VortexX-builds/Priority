import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { importTasks } from '../api';

const FIELD_MAP = {
    task_id:        'external_task_id',
    deadline_days:  'deadline_days',
    effort:         'effort',
    impact:         'impact',
    workload:       'workload',
};

const LABEL_COLORS = {
    Critical: '#dc2626',
    High:     '#ea580c',
    Medium:   '#ca8a04',
    Low:      '#71717a',
};

function normalizeHeader(h) {
    return String(h).trim().toLowerCase().replace(/\s+/g, '_');
}

function calcPreviewPriority(deadline_days, effort, impact, workload) {
    if (!deadline_days || !effort || !impact || !workload) return null;
    const hoursRemaining = Math.max(0.1, deadline_days * 24);
    const score = Math.max(0, (impact * 0.4) + ((1 / hoursRemaining) * 0.3) - (effort * 0.15) - (workload * 0.15));
    if (score >= 5) return 'Critical';
    if (score >= 3) return 'High';
    if (score >= 1) return 'Medium';
    return 'Low';
}

function parseRows(worksheet) {
    const raw = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return raw.map((row, idx) => {
        const normalized = {};
        for (const key of Object.keys(row)) {
            normalized[normalizeHeader(key)] = row[key];
        }

        const external_task_id = String(normalized.task_id || '').trim();
        const deadline_days    = parseInt(normalized.deadline_days, 10);
        const effort           = parseInt(normalized.effort, 10);
        const impact           = parseInt(normalized.impact, 10);
        const workload         = parseFloat(normalized.workload);

        const errors = [];
        if (!external_task_id)              errors.push('task_id is empty');
        if (isNaN(deadline_days) || deadline_days < 1 || deadline_days > 365) errors.push('deadline_days must be 1–365');
        if (isNaN(effort) || effort < 1 || effort > 20)   errors.push('effort must be 1–20');
        if (isNaN(impact) || impact < 1 || impact > 10)   errors.push('impact must be 1–10');
        if (isNaN(workload) || workload < 1 || workload > 10) errors.push('workload must be 1–10');

        const valid = errors.length === 0;
        const priority_label = valid
            ? calcPreviewPriority(deadline_days, effort, impact, workload)
            : null;

        return {
            _rowNum: idx + 2,
            external_task_id,
            title: external_task_id || `Row ${idx + 2}`,
            deadline_days:  isNaN(deadline_days) ? null : deadline_days,
            effort:         isNaN(effort) ? null : effort,
            impact:         isNaN(impact) ? null : impact,
            workload:       isNaN(workload) ? null : workload,
            priority_label,
            _errors: errors,
            _valid: valid,
        };
    });
}

const ExcelImport = ({ onTaskAdded }) => {
    const fileRef  = useRef(null);
    const [rows, setRows]       = useState([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult]   = useState(null);
    const [fileError, setFileError] = useState('');

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setResult(null);
        setFileError('');

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const parsed = parseRows(ws);
                setRows(parsed);
            } catch {
                setFileError('Could not parse the file. Make sure it is a valid .xlsx or .csv.');
                setRows([]);
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const handleImport = async () => {
        const valid = rows.filter(r => r._valid);
        if (valid.length === 0) return;
        setImporting(true);
        try {
            await importTasks(valid.map(({ external_task_id, title, deadline_days, effort, impact, workload }) => ({
                external_task_id,
                title,
                deadline_days,
                effort,
                impact,
                workload,
            })));
            setResult({ success: valid.length, total: rows.length });
            setRows([]);
            if (onTaskAdded) onTaskAdded();
        } catch (err) {
            setFileError(`Import failed: ${err.message}`);
        } finally {
            setImporting(false);
        }
    };

    const validCount = rows.filter(r => r._valid).length;

    return (
        <div>
            <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                style={{ display: 'none' }}
                onChange={handleFile}
            />

            {rows.length === 0 && !result && (
                <button
                    type="button"
                    className="btn-primary"
                    style={{ background: 'transparent', border: '1.5px dashed var(--accent-color)', color: 'var(--accent-color)' }}
                    onClick={() => fileRef.current.click()}
                >
                    📂 Choose Excel / CSV File
                </button>
            )}

            {fileError && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{fileError}</div>}

            {result && (
                <div style={{ color: 'var(--success-color)', fontSize: '0.88rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                    ✓ {result.success} of {result.total} tasks imported successfully!
                    <button
                        type="button"
                        style={{ display: 'block', margin: '0.5rem auto 0', background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                        onClick={() => { setResult(null); setRows([]); }}
                    >
                        Import another file
                    </button>
                </div>
            )}

            {rows.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-color)', marginBottom: '0.6rem' }}>
                        Preview — {validCount} valid, {rows.length - validCount} with errors
                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>(Priority recalculated on import)</span>
                    </div>

                    <div style={{ overflowX: 'auto', maxHeight: '260px', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--card-bg)', position: 'sticky', top: 0 }}>
                                    {['Row', 'Task ID', 'Days Due', 'Effort', 'Impact', 'Workload', 'Est. Priority', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color: 'var(--muted-color)', fontWeight: 600, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const labelColor = LABEL_COLORS[row.priority_label] || '#71717a';
                                    return (
                                        <tr
                                            key={row._rowNum}
                                            style={{ borderLeft: `3px solid ${row._valid ? 'var(--success-color)' : '#dc2626'}` }}
                                        >
                                            <td style={{ padding: '0.35rem 0.6rem', color: 'var(--muted-color)' }}>{row._rowNum}</td>
                                            <td style={{ padding: '0.35rem 0.6rem' }}>{row.external_task_id || '—'}</td>
                                            <td style={{ padding: '0.35rem 0.6rem' }}>{row.deadline_days ?? '—'}</td>
                                            <td style={{ padding: '0.35rem 0.6rem' }}>{row.effort ?? '—'}</td>
                                            <td style={{ padding: '0.35rem 0.6rem' }}>{row.impact ?? '—'}</td>
                                            <td style={{ padding: '0.35rem 0.6rem' }}>{row.workload ?? '—'}</td>
                                            <td style={{ padding: '0.35rem 0.6rem' }}>
                                                {row.priority_label ? (
                                                    <span style={{
                                                        display: 'inline-block', padding: '0.1rem 0.45rem',
                                                        borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem',
                                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                                        color: labelColor, background: `${labelColor}18`,
                                                        border: `1px solid ${labelColor}33`
                                                    }}>
                                                        {row.priority_label}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '0.35rem 0.6rem', color: row._valid ? 'var(--success-color)' : '#dc2626', fontWeight: 600 }}>
                                                {row._valid ? '✓ OK' : row._errors.join(', ')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleImport}
                            disabled={importing || validCount === 0}
                        >
                            {importing ? 'Importing…' : `Confirm Import (${validCount} tasks)`}
                        </button>
                        <button
                            type="button"
                            className="btn-sm btn-danger"
                            style={{ padding: '0.6rem 1rem' }}
                            onClick={() => { setRows([]); setResult(null); }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelImport;
