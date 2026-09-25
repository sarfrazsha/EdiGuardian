import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import Axios from 'axios';

// Online fee payment through the built-in sandbox gateway. No real gateway is
// contacted and no real money moves.
//   1. details  - payment method, account holder and account / card details
//   2. otp      - a 6-digit code is emailed to the parent; valid for 2 minutes
//   3. processing -> result
// The CVV is validated here only and never sent to the server; the server
// keeps just the last 4 digits of the card / wallet number.

const METHODS = [
    { id: 'Card', label: 'Card', sub: 'Debit / Credit', icon: 'bi-credit-card-2-front', color: '#1d4ed8' },
    { id: 'JazzCash', label: 'JazzCash', sub: 'Mobile Wallet', icon: 'bi-phone', color: '#c2410c' },
    { id: 'Easypaisa', label: 'Easypaisa', sub: 'Mobile Wallet', icon: 'bi-wallet2', color: '#15803d' }
];

const emptyFields = () => ({ holder: '', number: '', expiry: '', secret: '' });
const emptyOtp = () => ({ id: null, code: '', sentTo: '', sentAt: null, validSeconds: 120, resendAfter: 30, expired: false });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const onlyDigits = (v) => v.replace(/\D/g, '');

const formatCard = (v) => onlyDigits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v) => {
    const d = onlyDigits(v).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function validate(method, f) {
    const errors = {};
    if (!/^[A-Za-z][A-Za-z .'-]{2,59}$/.test(f.holder.trim())) {
        errors.holder = method === 'Card' ? 'Enter the name as shown on the card.' : 'Enter the account holder name.';
    }
    if (method === 'Card') {
        if (onlyDigits(f.number).length !== 16) errors.number = 'Card number must be 16 digits.';
        const m = /^(\d{2})\/(\d{2})$/.exec(f.expiry);
        if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) {
            errors.expiry = 'Enter a valid expiry (MM/YY).';
        } else {
            const expEnd = new Date(2000 + Number(m[2]), Number(m[1]), 1); // first day after expiry month
            if (expEnd <= new Date()) errors.expiry = 'This card has expired.';
        }
        if (!/^\d{3}$/.test(f.secret)) errors.secret = 'CVV must be 3 digits.';
    } else if (!/^03\d{9}$/.test(onlyDigits(f.number))) {
        errors.number = 'Enter an 11-digit account number (03XXXXXXXXX).';
    }
    return errors;
}

const apiError = (err, fallback) =>
    err.response?.data?.message ||
    (err.request && !err.response ? 'Unable to reach the payment server. Please check your connection and try again.' : fallback);

const money = (n) => `Rs ${Number(n || 0).toLocaleString()}`;

const PaymentModal = ({ show, fee, parentName, email, voucherNumber, onHide, onPaid, onViewReceipt }) => {
    const [stage, setStage] = useState('details'); // details | otp | processing | result
    const [method, setMethod] = useState('Card');
    const [fields, setFields] = useState(emptyFields());
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [otp, setOtp] = useState(emptyOtp());
    const [sendingOtp, setSendingOtp] = useState(false);
    const [result, setResult] = useState(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [now, setNow] = useState(Date.now());
    const busyRef = useRef(false);

    // Fresh form each time the modal opens for a voucher.
    useEffect(() => {
        if (show) {
            setStage('details');
            setMethod('Card');
            setFields(emptyFields());
            setErrors({});
            setFormError(null);
            setOtp(emptyOtp());
            setResult(null);
        }
    }, [show, fee?._id]);

    // 1-second tick for the OTP countdown.
    useEffect(() => {
        if (stage !== 'otp') return undefined;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [stage]);

    const elapsed = otp.sentAt ? Math.floor((now - otp.sentAt) / 1000) : 0;
    const secondsLeft = Math.max(0, otp.validSeconds - elapsed);
    const otpExpired = otp.expired || (otp.sentAt && secondsLeft === 0);
    const resendIn = Math.max(0, otp.resendAfter - elapsed);

    const methodInfo = METHODS.find(m => m.id === method);
    const steps = [
        'Verifying code...',
        method === 'Card' ? 'Contacting card issuer...' : `Connecting to ${method}...`,
        'Authorizing payment...',
        'Confirming payment...'
    ];

    useEffect(() => {
        if (stage !== 'processing') return undefined;
        setStepIndex(0);
        const t = setInterval(() => setStepIndex(i => Math.min(i + 1, steps.length - 1)), 700);
        return () => clearInterval(t);
    }, [stage]);

    const setField = (name, value) => {
        setFields(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const chooseMethod = (id) => {
        if (id === method) return;
        setMethod(id);
        setFields(prev => ({ ...emptyFields(), holder: prev.holder }));
        setErrors({});
        setFormError(null);
    };

    const paymentBody = () => ({
        role: 'parent',
        email,
        voucherId: fee._id,
        amount: fee.amount,
        paymentMethod: method,
        accountHolder: fields.holder.trim(),
        accountNumber: onlyDigits(fields.number)
    });

    // Step 1 -> 2: validate details and email the OTP.
    const requestOtp = async () => {
        if (busyRef.current) return;
        setFormError(null);
        const errs = validate(method, fields);
        setErrors(errs);
        if (Object.keys(errs).length) {
            setStage('details');
            return;
        }
        busyRef.current = true;
        setSendingOtp(true);
        try {
            const res = await Axios.post('/api/payments/otp', paymentBody());
            setNow(Date.now());
            setOtp({
                id: res.data.otpId,
                code: '',
                sentTo: res.data.sentTo,
                sentAt: Date.now(),
                validSeconds: res.data.validSeconds || 120,
                resendAfter: res.data.resendAfterSeconds || 30,
                expired: false
            });
            setStage('otp');
        } catch (err) {
            setFormError(apiError(err, 'Could not send the verification code. Please try again.'));
            if (err.response?.status === 409) onPaid && onPaid(null); // voucher changed - refresh the list
        } finally {
            busyRef.current = false;
            setSendingOtp(false);
        }
    };

    // Step 2 -> 3: verify the OTP and pay.
    const verifyAndPay = async (e) => {
        e.preventDefault();
        if (busyRef.current) return;
        setFormError(null);
        if (otpExpired) {
            setFormError('This code has expired. Please request a new one.');
            return;
        }
        if (!/^\d{6}$/.test(otp.code)) {
            setErrors(prev => ({ ...prev, otp: 'Enter the 6-digit code.' }));
            return;
        }

        busyRef.current = true;
        setStage('processing');
        const started = Date.now();
        try {
            const [res] = await Promise.all([
                Axios.post('/api/payments', { ...paymentBody(), otpId: otp.id, otpCode: otp.code }),
                sleep(2800)
            ]);
            setResult(res.data);
            setStage('result');
            onPaid && onPaid(res.data);
        } catch (err) {
            // Short pause so the processing screen doesn't just flash.
            await sleep(Math.max(0, 900 - (Date.now() - started)));
            const code = err.response?.data?.code;
            setFormError(apiError(err, 'Your payment could not be processed. Please try again.'));
            if (code === 'OTP_INVALID') {
                setOtp(prev => ({ ...prev, code: '' }));
                setStage('otp');
            } else if (code === 'OTP_EXPIRED') {
                setOtp(prev => ({ ...prev, code: '', expired: true }));
                setStage('otp');
            } else {
                if (err.response?.status === 409) onPaid && onPaid(null);
                setStage('details');
            }
        } finally {
            busyRef.current = false;
        }
    };

    const busy = stage === 'processing' || sendingOtp;
    const close = () => {
        if (busy) return;
        onHide();
    };

    if (!fee) return null;

    const payment = result?.payment;
    const methodText = payment ? `${payment.paymentMethod}${payment.accountLast4 ? ` •••• ${payment.accountLast4}` : ''}` : '';

    const detailRow = (label, value) => (
        <div className="d-flex justify-content-between gap-3 py-1">
            <span className="text-muted">{label}</span>
            <span className="text-end fw-semibold text-dark">{value}</span>
        </div>
    );

    const errorAlert = formError && (
        <Alert variant="danger" className="small py-2 d-flex align-items-start gap-2">
            <i className="bi bi-exclamation-triangle-fill mt-1"></i><span>{formError}</span>
        </Alert>
    );

    return (
        <Modal show={show} onHide={close} centered backdrop="static" keyboard={!busy} contentClassName="border-0 rounded-4 overflow-hidden">
            {/* ---------- Header / amount ---------- */}
            {stage !== 'result' && (
                <div className="px-4 pt-4 pb-3 border-bottom bg-light">
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <div className="small text-muted fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>Fee Payment</div>
                            <div className="fw-bold text-dark lh-1 mt-1" style={{ fontSize: '2rem' }}>{money(fee.amount)}</div>
                            {fee.discountAmount > 0 && (
                                <div className="small mt-1">
                                    <span className="text-muted text-decoration-line-through me-2">{money(fee.originalAmount)}</span>
                                    <Badge bg="success" className="bg-opacity-75">{fee.discountPercent}% discount</Badge>
                                </div>
                            )}
                            {fee.fineAmount > 0 && (
                                <div className="small mt-1 text-danger">
                                    <i className="bi bi-exclamation-circle me-1"></i>Includes Rs {Number(fee.fineAmount).toLocaleString()} fine{fee.fineReason ? ` (${fee.fineReason})` : ''}
                                </div>
                            )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Badge bg="warning" text="dark" className="rounded-pill px-3 py-2 d-flex align-items-center gap-1" title="Sandbox mode: no real money is charged">
                                <i className="bi bi-shield-lock-fill"></i>Sandbox Mode
                            </Badge>
                            {!busy && (
                                <button type="button" className="btn-close" aria-label="Close" onClick={close}></button>
                            )}
                        </div>
                    </div>

                    <Row className="g-2 mt-3 small">
                        {[
                            ['Student', fee.studentName],
                            ['Parent', parentName || '—'],
                            ['Voucher No.', voucherNumber],
                            ['Fee Month', `${fee.month} ${fee.year}`],
                            ['Class', fee.classNo || '—'],
                            ['Due Date', new Date(fee.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })]
                        ].map(([label, value]) => (
                            <Col xs={6} sm={4} key={label}>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{label}</div>
                                <div className="fw-semibold text-dark text-truncate" title={value}>{value}</div>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            <Modal.Body className="p-4">
                {/* ---------- Step 1: details ---------- */}
                {stage === 'details' && (
                    <Form noValidate onSubmit={(e) => { e.preventDefault(); requestOtp(); }}>
                        {errorAlert}

                        <Form.Label className="small fw-bold text-secondary">Payment Method</Form.Label>
                        <Row className="g-2 mb-4">
                            {METHODS.map(m => {
                                const active = method === m.id;
                                return (
                                    <Col xs={4} key={m.id}>
                                        <button
                                            type="button"
                                            onClick={() => chooseMethod(m.id)}
                                            disabled={busy}
                                            className={`w-100 h-100 rounded-3 bg-white text-center p-2 position-relative ${active ? 'shadow-sm' : ''}`}
                                            style={{
                                                border: active ? `2px solid ${m.color}` : '1px solid #dee2e6',
                                                transition: 'all .15s ease'
                                            }}
                                            aria-pressed={active}
                                        >
                                            {active && (
                                                <i className="bi bi-check-circle-fill position-absolute" style={{ top: 6, right: 8, color: m.color, fontSize: '0.9rem' }}></i>
                                            )}
                                            <i className={`bi ${m.icon} d-block`} style={{ fontSize: '1.5rem', color: m.color }}></i>
                                            <div className="fw-bold small text-dark mt-1">{m.label}</div>
                                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{m.sub}</div>
                                        </button>
                                    </Col>
                                );
                            })}
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-secondary">{method === 'Card' ? 'Card Holder Name' : 'Account Holder Name'}</Form.Label>
                            <Form.Control
                                autoComplete="off"
                                value={fields.holder}
                                isInvalid={!!errors.holder}
                                onChange={e => setField('holder', e.target.value)}
                                placeholder={method === 'Card' ? 'Name on card' : `Name on ${method} account`}
                            />
                            <Form.Control.Feedback type="invalid">{errors.holder}</Form.Control.Feedback>
                        </Form.Group>

                        {method === 'Card' ? (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-secondary">Card Number</Form.Label>
                                    <div className="position-relative">
                                        <Form.Control
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={fields.number}
                                            isInvalid={!!errors.number}
                                            onChange={e => setField('number', formatCard(e.target.value))}
                                            placeholder="4242 4242 4242 4242"
                                            style={{ letterSpacing: '1px', paddingRight: '2.5rem' }}
                                        />
                                        <i className="bi bi-credit-card position-absolute text-muted" style={{ right: 12, top: 9 }}></i>
                                        <Form.Control.Feedback type="invalid">{errors.number}</Form.Control.Feedback>
                                    </div>
                                </Form.Group>
                                <Row className="g-3 mb-4">
                                    <Col xs={6}>
                                        <Form.Label className="small fw-bold text-secondary">Expiry</Form.Label>
                                        <Form.Control
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={fields.expiry}
                                            isInvalid={!!errors.expiry}
                                            onChange={e => setField('expiry', formatExpiry(e.target.value))}
                                            placeholder="MM/YY"
                                        />
                                        <Form.Control.Feedback type="invalid">{errors.expiry}</Form.Control.Feedback>
                                    </Col>
                                    <Col xs={6}>
                                        <Form.Label className="small fw-bold text-secondary">CVV</Form.Label>
                                        <Form.Control
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={fields.secret}
                                            isInvalid={!!errors.secret}
                                            onChange={e => setField('secret', onlyDigits(e.target.value).slice(0, 3))}
                                            placeholder="•••"
                                        />
                                        <Form.Control.Feedback type="invalid">{errors.secret}</Form.Control.Feedback>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-secondary">{method} Account Number</Form.Label>
                                <Form.Control
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={fields.number}
                                    isInvalid={!!errors.number}
                                    onChange={e => setField('number', onlyDigits(e.target.value).slice(0, 11))}
                                    placeholder="03XXXXXXXXX"
                                    style={{ letterSpacing: '1px' }}
                                />
                                <Form.Control.Feedback type="invalid">{errors.number}</Form.Control.Feedback>
                                <Form.Text className="text-muted small">The mobile number linked to your {method} account.</Form.Text>
                            </Form.Group>
                        )}

                        <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold py-2 shadow-sm" disabled={busy}>
                            {sendingOtp
                                ? <><Spinner size="sm" className="me-2" />Sending verification code...</>
                                : <><i className="bi bi-lock-fill me-2"></i>Continue to Pay {money(fee.amount)}</>}
                        </Button>
                        <div className="text-center text-muted mt-2" style={{ fontSize: '0.72rem' }}>
                            <i className="bi bi-envelope-check me-1"></i>A verification code will be sent to your registered email.
                            {method === 'Card' && ' Your CVV is never stored.'}
                        </div>
                    </Form>
                )}

                {/* ---------- Step 2: email OTP ---------- */}
                {stage === 'otp' && (
                    <Form noValidate onSubmit={verifyAndPay}>
                        <div className="text-center mb-3">
                            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 56, height: 56, background: '#e0f2fe' }}>
                                <i className="bi bi-envelope-paper-fill text-primary" style={{ fontSize: '1.6rem' }}></i>
                            </div>
                            <h5 className="fw-bold mb-1">Verify Your Payment</h5>
                            <p className="small text-muted mb-0">
                                Enter the 6-digit code sent to <strong className="text-dark">{otp.sentTo}</strong>
                            </p>
                        </div>

                        {errorAlert}

                        <div className="bg-light rounded-3 px-3 py-2 small mb-3">
                            {detailRow('Pay with', `${method} •••• ${onlyDigits(fields.number).slice(-4)}`)}
                            {detailRow('Account Holder', fields.holder.trim())}
                        </div>

                        <Form.Control
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            value={otp.code}
                            isInvalid={!!errors.otp}
                            disabled={otpExpired}
                            onChange={e => {
                                setOtp(prev => ({ ...prev, code: onlyDigits(e.target.value).slice(0, 6) }));
                                if (errors.otp) setErrors(prev => ({ ...prev, otp: undefined }));
                                if (formError) setFormError(null);
                            }}
                            placeholder="••••••"
                            className="text-center fw-bold"
                            style={{ fontSize: '1.6rem', letterSpacing: '0.7rem' }}
                        />
                        <Form.Control.Feedback type="invalid" className="text-center">{errors.otp}</Form.Control.Feedback>

                        <div className="d-flex justify-content-between align-items-center mt-2 mb-4 small">
                            {otpExpired ? (
                                <span className="text-danger fw-semibold"><i className="bi bi-clock-history me-1"></i>Code expired</span>
                            ) : (
                                <span className={secondsLeft <= 30 ? 'text-danger fw-semibold' : 'text-muted'}>
                                    <i className="bi bi-clock me-1"></i>Code expires in {mmss(secondsLeft)}
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0"
                                disabled={sendingOtp || (!otpExpired && resendIn > 0)}
                                onClick={requestOtp}
                            >
                                {sendingOtp ? 'Sending...' : `Resend code${!otpExpired && resendIn > 0 ? ` (${resendIn}s)` : ''}`}
                            </button>
                        </div>

                        <Button type="submit" variant="primary" className="w-100 rounded-pill fw-bold py-2 shadow-sm" disabled={busy || otpExpired || otp.code.length !== 6}>
                            <i className="bi bi-shield-check me-2"></i>Verify & Pay {money(fee.amount)}
                        </Button>
                        <div className="text-center mt-2">
                            <button type="button" className="btn btn-link btn-sm text-muted" disabled={busy} onClick={() => { setFormError(null); setStage('details'); }}>
                                <i className="bi bi-arrow-left me-1"></i>Edit payment details
                            </button>
                        </div>
                    </Form>
                )}

                {/* ---------- Processing ---------- */}
                {stage === 'processing' && (
                    <div className="text-center py-4">
                        <div className="position-relative d-inline-block mb-3">
                            <Spinner animation="border" style={{ width: '4rem', height: '4rem', color: methodInfo.color }} />
                            <i className={`bi ${methodInfo.icon} position-absolute top-50 start-50 translate-middle`} style={{ fontSize: '1.4rem', color: methodInfo.color }}></i>
                        </div>
                        <h5 className="fw-bold mb-1">Processing Payment...</h5>
                        <p className="text-muted small mb-4">{steps[stepIndex]}</p>
                        <div className="d-flex justify-content-center gap-2 mb-3">
                            {steps.map((_, i) => (
                                <span key={i} className="rounded-pill" style={{ width: 28, height: 4, background: i <= stepIndex ? methodInfo.color : '#e5e7eb', transition: 'background .3s' }}></span>
                            ))}
                        </div>
                        <p className="small text-muted mb-0"><i className="bi bi-exclamation-circle me-1"></i>Please don't close this window.</p>
                    </div>
                )}

                {/* ---------- Result ---------- */}
                {stage === 'result' && payment && (
                    <div className="text-center">
                        <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 mt-2" style={{ width: 80, height: 80, background: '#dcfce7' }}>
                            <i className="bi bi-check-lg" style={{ fontSize: '2.6rem', color: '#16a34a' }}></i>
                        </div>
                        <h4 className="fw-bold mb-1">Payment Successful</h4>
                        <div className="fw-bold mb-3" style={{ fontSize: '1.6rem', color: '#16a34a' }}>{money(payment.amount)}</div>

                        <Alert variant="info" className="small text-start py-2 d-flex gap-2">
                            <i className="bi bi-hourglass-split mt-1"></i>
                            <span>Your payment has been sent to the school for verification. The voucher will show as <strong>Paid</strong> once it is approved.</span>
                        </Alert>

                        <div className="bg-light rounded-3 p-3 small text-start mb-4">
                            {detailRow('Transaction ID', payment.transactionId)}
                            {detailRow('Payment Method', methodText)}
                            {detailRow('Account Holder', payment.accountHolder || fields.holder.trim())}
                            {detailRow('Date & Time', new Date(payment.createdAt).toLocaleString())}
                            {detailRow('Voucher No.', payment.voucher?.voucherNumber || voucherNumber)}
                            {detailRow('Student', payment.studentName)}
                            <div className="d-flex justify-content-between align-items-center pt-1">
                                <span className="text-muted">Status</span>
                                <Badge bg="info" className="rounded-pill px-3 py-2">Under Review</Badge>
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <Button variant="outline-success" className="flex-fill rounded-pill fw-bold" onClick={() => onViewReceipt(payment._id)}>
                                <i className="bi bi-file-earmark-text me-2"></i>View Receipt
                            </Button>
                            <Button variant="primary" className="flex-fill rounded-pill fw-bold" onClick={onHide}>Done</Button>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default PaymentModal;
