'use client'

import React, { useState, useCallback, useRef } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FiUpload,
  FiCheck,
  FiTrash2,
  FiUser,
  FiActivity,
  FiAlertCircle,
  FiClock,
  FiRefreshCw,
  FiFileText,
  FiHeart,
  FiArrowRight,
  FiShield,
  FiZap,
} from 'react-icons/fi'

// ============================================================
// Constants
// ============================================================

const AGENT_ID = '6997e0e382553f2b07a0dc97'
const FIT_THRESHOLD = 80

const THEME_VARS = {
  '--background': '0 0% 100%',
  '--foreground': '222 47% 11%',
  '--card': '0 0% 98%',
  '--card-foreground': '222 47% 11%',
  '--primary': '222 47% 11%',
  '--primary-foreground': '210 40% 98%',
  '--secondary': '210 40% 96%',
  '--secondary-foreground': '222 47% 11%',
  '--muted': '210 40% 94%',
  '--muted-foreground': '215 16% 47%',
  '--border': '214 32% 91%',
  '--input': '214 32% 85%',
  '--destructive': '0 84% 60%',
  '--accent': '210 40% 92%',
  '--radius': '0.875rem',
} as React.CSSProperties

// ============================================================
// Types
// ============================================================

interface ScreeningResult {
  candidate_name?: string
  fit_status?: string
  overall_score?: number
  skills_match?: { matched_skills?: string[]; missing_skills?: string[]; score?: number }
  experience_evaluation?: { summary?: string; years_relevant?: string; score?: number }
  nice_to_haves?: { matched?: string[]; score?: number }
  recommendation?: string
  email_sent?: boolean
  email_summary?: string
}

interface HistoryEntry {
  id: string
  candidateName: string
  overallScore: number
  timestamp: string
  data: ScreeningResult
}

// ============================================================
// Helper: format file size
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// ============================================================
// Score Ring Component
// ============================================================

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const normalizedScore = Math.max(0, Math.min(100, score ?? 0))
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (normalizedScore / 100) * circumference
  const isPass = normalizedScore >= FIT_THRESHOLD
  const strokeColor = isPass ? '#16a34a' : '#d97706'
  const bgStrokeColor = isPass ? '#dcfce7' : '#fef3c7'
  const textColor = isPass ? 'text-green-700' : 'text-amber-700'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgStrokeColor}
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-bold tracking-tighter', textColor)}>
          {normalizedScore}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
          percent match
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Dropzone Component
// ============================================================

function FileDropzone({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File) => void
  disabled?: boolean
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (disabled) return
      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        const ext = file.name.toLowerCase()
        if (ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc')) {
          onFileSelect(file)
        }
      }
    },
    [disabled, onFileSelect]
  )

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'group relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300',
        isDragOver
          ? 'border-primary/70 bg-primary/[0.03] scale-[1.01] shadow-lg'
          : 'border-border/80 hover:border-primary/40 hover:bg-slate-50/50 hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'p-4 rounded-2xl transition-all duration-300',
          isDragOver
            ? 'bg-primary/10 shadow-sm'
            : 'bg-slate-100 group-hover:bg-slate-200/70'
        )}>
          <FiUpload className={cn(
            'w-7 h-7 transition-colors duration-300',
            isDragOver ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'
          )} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground tracking-tight">
            {isDragOver ? 'Drop your resume here' : 'Drag & drop your resume'}
          </p>
          <p className="text-xs text-muted-foreground">
            or <span className="text-primary/80 font-medium">click to browse</span> -- PDF, DOCX (max 10MB)
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// File Preview Component
// ============================================================

function FilePreview({
  file,
  onRemove,
  disabled,
}: {
  file: File
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 transition-all duration-200 hover:bg-slate-100/50">
      <div className="p-3 rounded-xl bg-primary/[0.08]">
        <FiFileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate tracking-tight">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-200 disabled:opacity-50"
        aria-label="Remove file"
      >
        <FiTrash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================
// Candidate-Facing Results Display
// ============================================================

function ResultsDisplay({ data }: { data: ScreeningResult }) {
  const score = data?.overall_score ?? 0
  const isPass = score >= FIT_THRESHOLD
  const candidateName = data?.candidate_name ?? 'Candidate'

  return (
    <div className="flex flex-col items-center text-center py-8 space-y-8 px-2">
      {/* Candidate Greeting */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-muted-foreground mb-2">
          <FiUser className="w-3 h-3" />
          Screening Complete
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Hello, {candidateName}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Your resume has been evaluated for the Platform Engineer role
        </p>
      </div>

      {/* Score Ring */}
      <div className="py-2">
        <ScoreRing score={score} size={180} />
      </div>

      {/* Match Bar */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-muted-foreground">Match Score</span>
          <span className={cn(
            'font-bold text-sm',
            isPass ? 'text-green-700' : 'text-amber-700'
          )}>{score}%</span>
        </div>
        <div className="relative">
          <Progress value={score} className="h-2.5 rounded-full" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-400/60 rounded-full"
            style={{ left: `${FIT_THRESHOLD}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
          <span>0%</span>
          <span className={cn(isPass ? 'text-green-600' : 'text-slate-400')}>
            {FIT_THRESHOLD}% threshold
          </span>
          <span>100%</span>
        </div>
      </div>

      <Separator className="w-full max-w-xs" />

      {/* Result Message */}
      {isPass ? (
        <div className="space-y-5 max-w-sm w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-green-100 ring-4 ring-green-50">
              <FiCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800 tracking-tight">
              You are a strong match
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your profile aligns well with the Platform Engineer role requirements.
            Our recruiting team has been notified and will review your application.
            You can expect to hear from us soon regarding the next steps.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200/80">
            <div className="p-2 rounded-xl bg-green-100">
              <FiArrowRight className="w-4 h-4 text-green-700" />
            </div>
            <p className="text-sm font-medium text-green-800 text-left">
              Your profile has been forwarded to our hiring team
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-w-sm w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-amber-100 ring-4 ring-amber-50">
              <FiHeart className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              Thank you for applying
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We appreciate your interest in the Platform Engineer position.
            After carefully reviewing your resume, we found that your current
            profile does not fully match the requirements for this specific
            role at this time.
          </p>
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2.5 text-left">
            <p className="text-sm text-amber-900 font-semibold">
              Don&apos;t be discouraged
            </p>
            <p className="text-[13px] text-amber-800/80 leading-relaxed">
              This does not reflect on your abilities or potential. Every role
              has unique requirements, and we encourage you to keep building
              your skills and explore other opportunities that may be a better
              fit. We wish you the very best in your career journey.
            </p>
          </div>
        </div>
      )}

      {/* Footer Hint */}
      <p className="text-[11px] text-muted-foreground/60 pt-4 tracking-wide">
        Want to check another resume? Use the upload area to submit a new one.
      </p>
    </div>
  )
}

// ============================================================
// Loading Skeleton
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center py-12 space-y-8">
      <Skeleton className="w-[180px] h-[180px] rounded-full" />
      <div className="space-y-3 w-full max-w-sm">
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-3 w-36 mx-auto" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <Skeleton className="h-px w-48" />
      <div className="space-y-3 w-full max-w-sm">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-5 w-52 mx-auto" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5 mx-auto" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  )
}

// ============================================================
// Error Boundary
// ============================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <div className="p-3 rounded-full bg-red-100 inline-flex mb-4">
              <FiAlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6 text-sm">{this.state.error}</p>
            <Button
              onClick={() => this.setState({ hasError: false, error: '' })}
              size="sm"
            >
              Try again
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// Main Page Component
// ============================================================

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isScreening, setIsScreening] = useState(false)
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setErrorMessage(null)
    setScreeningResult(null)
  }, [])

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setErrorMessage(null)
  }, [])

  const handleScreen = useCallback(async () => {
    if (!selectedFile) return

    setIsScreening(true)
    setErrorMessage(null)
    setScreeningResult(null)
    setActiveAgentId(AGENT_ID)

    try {
      console.log('[ResumeScreener] Uploading file:', selectedFile.name, selectedFile.size)
      const uploadResult = await uploadFiles(selectedFile)
      console.log('[ResumeScreener] Upload result:', JSON.stringify(uploadResult))

      if (!uploadResult.success || !Array.isArray(uploadResult.asset_ids) || uploadResult.asset_ids.length === 0) {
        const errMsg = uploadResult.error
          ?? (uploadResult.asset_ids?.length === 0 ? 'Upload succeeded but no asset IDs were returned. Please try again.' : 'File upload failed. Please try again.')
        setErrorMessage(errMsg)
        setIsScreening(false)
        setActiveAgentId(null)
        return
      }

      console.log('[ResumeScreener] Asset IDs for agent:', uploadResult.asset_ids)

      const result: AIAgentResponse = await callAIAgent(
        'Screen this resume against the Platform Engineer job description. Evaluate skills match, experience, and qualifications. If the candidate is a fit, send an email summary to shreyas+bot@lyzr.ai via Gmail.',
        AGENT_ID,
        { assets: uploadResult.asset_ids }
      )
      console.log('[ResumeScreener] Agent result:', JSON.stringify(result))

      if (result.success) {
        let data: ScreeningResult | undefined

        if (result?.response?.result && typeof result.response.result === 'object' && Object.keys(result.response.result).length > 0) {
          const inner = result.response.result as any
          if (inner.candidate_name || inner.fit_status) {
            data = inner as ScreeningResult
          } else if (inner.result && typeof inner.result === 'object' && (inner.result.candidate_name || inner.result.fit_status)) {
            data = inner.result as ScreeningResult
          } else if (inner.text && typeof inner.text === 'string') {
            try {
              const parsed = JSON.parse(inner.text)
              if (parsed.candidate_name || parsed.fit_status || parsed.result) {
                data = parsed.result ?? parsed
              }
            } catch {
              // Not JSON text
            }
          } else {
            data = inner as ScreeningResult
          }
        }

        if (!data && result?.response?.message && typeof result.response.message === 'string') {
          try {
            const parsed = JSON.parse(result.response.message)
            if (parsed.candidate_name || parsed.fit_status || parsed.result) {
              data = parsed.result ?? parsed
            }
          } catch {
            // Not JSON
          }
        }

        if (!data && result?.raw_response && typeof result.raw_response === 'string') {
          try {
            const rawParsed = JSON.parse(result.raw_response)
            const deepResult = rawParsed?.response?.result ?? rawParsed?.result ?? rawParsed
            if (deepResult?.candidate_name || deepResult?.fit_status) {
              data = deepResult as ScreeningResult
            }
          } catch {
            // Not parseable
          }
        }

        console.log('[ResumeScreener] Parsed screening data:', JSON.stringify(data))

        if (data && (data.candidate_name || data.fit_status)) {
          setScreeningResult(data)

          const entry: HistoryEntry = {
            id: String(Date.now()),
            candidateName: data?.candidate_name ?? 'Unknown',
            overallScore: data?.overall_score ?? 0,
            timestamp: 'Just now',
            data: data,
          }
          setHistory((prev) => [entry, ...prev])
        } else {
          console.error('[ResumeScreener] Could not parse screening data from response:', result)
          setErrorMessage('We encountered an issue processing your resume. Please try again.')
        }
      } else {
        setErrorMessage(result.error ?? 'Something went wrong while screening your resume. Please try again.')
      }
    } catch (err) {
      console.error('[ResumeScreener] Error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsScreening(false)
      setActiveAgentId(null)
    }
  }, [selectedFile])

  const handleHistoryClick = useCallback((entry: HistoryEntry) => {
    setScreeningResult(entry.data)
    setSelectedFile(null)
  }, [])

  const handleUploadNew = useCallback(() => {
    setSelectedFile(null)
    setScreeningResult(null)
    setErrorMessage(null)
  }, [])

  return (
    <ErrorBoundary>
      <div
        style={THEME_VARS}
        className="min-h-screen text-foreground font-sans"
      >
        {/* Subtle background pattern */}
        <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,hsl(210_20%_97%)_0%,hsl(220_25%_95%)_35%,hsl(200_20%_96%)_70%,hsl(230_15%_97%)_100%)]" />
        <div className="fixed inset-0 -z-10 opacity-[0.35] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(210_40%_90%),transparent)]" />

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60">
          <div className="bg-white/70 backdrop-blur-2xl">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-[60px]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-foreground">
                    <FiShield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-[15px] font-bold tracking-tight leading-tight">Lyzr Architect Resume Screener</h1>
                    <p className="text-[11px] text-muted-foreground/70 font-medium tracking-wide">Platform Engineer Position</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300',
                    activeAgentId
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-muted-foreground'
                  )}>
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      activeAgentId ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                    )} />
                    {activeAgentId ? 'Processing' : 'Ready'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* Left Panel */}
            <div className="lg:col-span-5 space-y-5">
              {/* Upload Card */}
              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm shadow-slate-200/50 overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-100">
                      <FiUpload className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <h2 className="text-[14px] font-bold tracking-tight">Upload Your Resume</h2>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed pl-[30px]">
                    Submit your resume to check how well it matches the position
                  </p>
                </div>

                <div className="px-6 pb-2 space-y-4">
                  {!selectedFile && !isScreening && (
                    <FileDropzone
                      onFileSelect={handleFileSelect}
                      disabled={isScreening}
                    />
                  )}

                  {selectedFile && (
                    <FilePreview
                      file={selectedFile}
                      onRemove={handleFileRemove}
                      disabled={isScreening}
                    />
                  )}

                  {errorMessage && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200/60">
                      <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 leading-relaxed">{errorMessage}</p>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 pt-2">
                  {screeningResult && !isScreening ? (
                    <Button
                      onClick={handleUploadNew}
                      variant="outline"
                      className="w-full h-11 rounded-xl text-[13px] font-semibold"
                    >
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Screen Another Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={handleScreen}
                      disabled={!selectedFile || isScreening}
                      className="w-full h-11 rounded-xl text-[13px] font-semibold shadow-sm"
                    >
                      {isScreening ? (
                        <>
                          <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-4 h-4 mr-2" />
                          Check My Resume
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* How It Works */}
              {!screeningResult && !isScreening && history.length === 0 && (
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-slate-200/50 p-6 space-y-4">
                  <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground/60">How it works</h3>
                  <div className="space-y-3.5">
                    {[
                      { step: '1', text: 'Upload your resume in PDF or DOCX format' },
                      { step: '2', text: 'Our AI evaluates your profile against the job description' },
                      { step: '3', text: 'Get your match score instantly' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[11px] font-bold text-slate-500">{item.step}</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Checks */}
              {history.length > 0 && (
                <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm shadow-slate-200/50 overflow-hidden">
                  <div className="px-6 pt-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-100">
                        <FiClock className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <h2 className="text-[14px] font-bold tracking-tight">Recent Checks</h2>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <ScrollArea className="max-h-[240px]">
                      <div className="space-y-1">
                        {history.map((entry) => {
                          const entryIsPass = entry.overallScore >= FIT_THRESHOLD
                          return (
                            <button
                              key={entry.id}
                              onClick={() => handleHistoryClick(entry)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200 text-left group"
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                entryIsPass ? 'bg-green-100' : 'bg-amber-100'
                              )}>
                                {entryIsPass ? (
                                  <FiCheck className="w-3.5 h-3.5 text-green-700" />
                                ) : (
                                  <FiHeart className="w-3.5 h-3.5 text-amber-700" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">
                                  {entry.candidateName}
                                </p>
                                <p className="text-[11px] text-muted-foreground/60">{entry.timestamp}</p>
                              </div>
                              <span className={cn(
                                'text-xs font-bold tabular-nums',
                                entryIsPass ? 'text-green-700' : 'text-amber-700'
                              )}>
                                {entry.overallScore}%
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Agent Status */}
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white/50 backdrop-blur-xl border border-slate-200/40">
                <div className={cn(
                  'w-2 h-2 rounded-full transition-all duration-500',
                  activeAgentId ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                )} />
                <p className="text-[11px] text-muted-foreground/70 font-medium flex-1">
                  {activeAgentId ? 'AI is analyzing your resume...' : 'AI Screening Engine ready'}
                </p>
                <FiActivity className={cn(
                  'w-3 h-3 transition-colors',
                  activeAgentId ? 'text-green-500 animate-pulse' : 'text-slate-300'
                )} />
              </div>
            </div>

            {/* Right Panel: Results */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm shadow-slate-200/50 overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-100">
                        <FiUser className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <div>
                        <h2 className="text-[14px] font-bold tracking-tight">Screening Results</h2>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">Resume match analysis</p>
                      </div>
                    </div>
                    {screeningResult && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[11px] font-bold px-2.5 py-0.5',
                          (screeningResult.overall_score ?? 0) >= FIT_THRESHOLD
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                        )}
                      >
                        {(screeningResult.overall_score ?? 0) >= FIT_THRESHOLD ? 'Match' : 'Below threshold'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-8">
                  {isScreening ? (
                    <div className="space-y-4 pt-6">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/50">
                        <div className="p-2 rounded-xl bg-blue-100">
                          <FiRefreshCw className="w-4 h-4 text-blue-700 animate-spin" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-blue-900">Analyzing your resume...</p>
                          <p className="text-[11px] text-blue-600 mt-0.5">
                            This usually takes a moment. Hang tight!
                          </p>
                        </div>
                      </div>
                      <LoadingSkeleton />
                    </div>
                  ) : screeningResult ? (
                    <ResultsDisplay data={screeningResult} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="p-5 rounded-2xl bg-slate-100/80 mb-5">
                        <FiUpload className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-base font-bold tracking-tight mb-2">Ready to check your fit?</h3>
                      <p className="text-sm text-muted-foreground/70 max-w-xs leading-relaxed">
                        Upload your resume and we will instantly analyze how well
                        it matches the Platform Engineer position.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40 font-medium tracking-wide">
            <span>Powered by</span>
            <span className="font-bold text-muted-foreground/60">Lyzr AI</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
