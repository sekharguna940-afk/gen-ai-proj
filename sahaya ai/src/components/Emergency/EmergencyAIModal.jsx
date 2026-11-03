import { useState } from 'react';
import { Sparkles, X, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { askEmergencyAI } from '../../services/emergencyApi';

const EmergencyAIModal = ({ isOpen, onClose, onApplyCategory }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    if (!isOpen) return null;

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        try {
            const data = await askEmergencyAI(input);
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop animate-fade-in" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '8px', color: '#2563eb' }}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', color: '#1e3a8a' }}>SAHAYA AI Emergency Assistant</h2>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                Non-clinical triage advice, category detection & safety checklists
                            </p>
                        </div>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '16px 0' }}>
                    <form onSubmit={handleAnalyze}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                            Describe what happened in your own words:
                        </label>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="e.g. Someone collapsed near the market with chest pain and difficulty breathing..."
                            rows="3"
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !input.trim()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                {loading ? <Loader2 size={16} className="spin-icon" /> : <Sparkles size={16} />}
                                Analyze & Assist
                            </button>
                        </div>
                    </form>

                    {result && (
                        <div className="ai-results-block animate-fade-in" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#166534', fontWeight: 700 }}>
                                        Suggested Category
                                    </span>
                                    <h4 style={{ color: '#14532d', fontSize: '1.05rem', margin: '2px 0' }}>
                                        {result.suggested_category.replace('_', ' ').toUpperCase()}
                                    </h4>
                                </div>
                                {onApplyCategory && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={() => {
                                            onApplyCategory(result.suggested_category);
                                            onClose();
                                        }}
                                        style={{ fontSize: '0.8rem', background: '#fff' }}
                                    >
                                        Apply Category <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>

                            {result.missing_critical_details?.length > 0 && (
                                <div style={{ marginBottom: '14px', background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertCircle size={15} />
                                        Information that would help responders arrive faster:
                                    </div>
                                    <ul style={{ margin: '6px 0 0 20px', fontSize: '0.82rem', color: '#78350f' }}>
                                        {result.missing_critical_details.map((m, idx) => (
                                            <li key={idx}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldCheck size={16} style={{ color: '#15803d' }} />
                                    Immediate Safety Checklist:
                                </div>
                                <ul style={{ margin: '6px 0 0 20px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                                    {result.immediate_safety_advice?.map((adv, idx) => (
                                        <li key={idx}>{adv}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {result?.disclaimer || 'AI guidance is advisory only and must not replace professional emergency medical or rescue assessment.'}
                </div>
            </div>
        </div>
    );
};

export default EmergencyAIModal;

