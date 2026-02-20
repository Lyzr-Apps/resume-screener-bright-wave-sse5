'use client'

import React, { useState, useCallback, useRef } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
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
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (normalizedScore / 100) * circumference
  const isPass = normalizedScore >= FIT_THRESHOLD
  const strokeColor = isPass ? '#22c55e' : '#f59e0b'
  const textColor = isPass ? 'text-green-600' : 'text-amber-600'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-3xl font-bold tracking-tight', textColor)}>
            {normalizedScore}%
          </span>
          <span className="text-xs text-muted-foreground font-medium">match</span>
        </div>
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
        'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
        isDragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-accent/30',
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
      <div className="flex flex-col items-center gap-3">
        <div className={cn('p-4 rounded-full transition-colors', isDragOver ? 'bg-primary/10' : 'bg-muted')}>
          <FiUpload className={cn('w-7 h-7', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragOver ? 'Drop your resume here' : 'Drag & drop your resume'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse -- PDF, DOCX accepted (max 10MB)</p>
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
    <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/40 border border-border/60">
      <div className="p-2.5 rounded-lg bg-primary/10">
        <FiFileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
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
    <div className="flex flex-col items-center text-center py-6 space-y-8">
      {/* Greeting */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Hello, {candidateName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here are your screening results for the Platform Engineer role
        </p>
      </div>

      {/* Score Ring */}
      <ScoreRing score={score} size={160} />

      {/* Match Progress Bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Match Score</span>
          <span className="font-medium">{score}%</span>
        </div>
        <Progress value={score} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className={cn('font-medium', score >= FIT_THRESHOLD ? 'text-green-600' : 'text-muted-foreground')}>
            {FIT_THRESHOLD}% required
          </span>
          <span>100%</span>
        </div>
      </div>

      <Separator className="w-full max-w-sm" />

      {/* Result Message */}
      {isPass ? (
        <div className="space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100">
            <FiCheck className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700">
            Great news! You are a strong match.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your profile aligns well with the Platform Engineer role requirements.
            Our recruiting team has been notified and will review your application.
            You can expect to hear from us soon regarding the next steps.
          </p>
          <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200">
            <FiArrowRight className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700">
              Your profile has been forwarded to our hiring team
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-100">
            <FiHeart className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Thank you for applying!
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We appreciate your interest in the Platform Engineer position.
            After carefully reviewing your resume, we found that your current profile
            does not fully match the requirements for this specific role at this time.
          </p>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <p className="text-sm text-amber-800 font-medium">
              Don&apos;t be discouraged!
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              This does not reflect on your abilities or potential. Every role has
              unique requirements, and we encourage you to keep building your skills
              and explore other opportunities that may be a better fit.
              We wish you the very best in your career journey.
            </p>
          </div>
        </div>
      )}

      {/* Try Another */}
      <p className="text-xs text-muted-foreground pt-2">
        Want to check another resume? Use the upload area to submit a new one.
      </p>
    </div>
  )
}

// ============================================================
// Loading Skeleton (simplified for candidate view)
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center py-10 space-y-6">
      <Skeleton className="w-40 h-40 rounded-full" />
      <div className="space-y-3 w-full max-w-xs">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-48 mx-auto" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="space-y-2 w-full max-w-sm">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5 mx-auto" />
        <Skeleton className="h-3 w-3/5 mx-auto" />
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
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
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
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isScreening, setIsScreening] = useState(false)
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setErrorMessage(null)
    setScreeningResult(null)
  }, [])

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setErrorMessage(null)
  }, [])

  // Handle resume screening
  const handleScreen = useCallback(async () => {
    if (!selectedFile) return

    setIsScreening(true)
    setErrorMessage(null)
    setScreeningResult(null)
    setActiveAgentId(AGENT_ID)

    try {
      // Step 1: Upload the file
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

      // Step 2: Call the agent with the uploaded file assets
      const result: AIAgentResponse = await callAIAgent(
        'Screen this resume against the Platform Engineer job description. Evaluate skills match, experience, and qualifications. If the candidate is a fit, send an email summary to shreyas+bot@lyzr.ai via Gmail.',
        AGENT_ID,
        { assets: uploadResult.asset_ids }
      )
      console.log('[ResumeScreener] Agent result:', JSON.stringify(result))

      if (result.success) {
        // Try multiple access patterns for the response data
        let data: ScreeningResult | undefined

        // Primary: result.response.result (standard normalized response)
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

        // Fallback: check result.response.message for JSON string
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

        // Fallback: check raw_response
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

          // Add to history
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

  // Handle clicking a history entry
  const handleHistoryClick = useCallback((entry: HistoryEntry) => {
    setScreeningResult(entry.data)
    setSelectedFile(null)
  }, [])

  // Handle "Upload New"
  const handleUploadNew = useCallback(() => {
    setSelectedFile(null)
    setScreeningResult(null)
    setErrorMessage(null)
  }, [])

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-foreground font-sans">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                  <FiFileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Lyzr Architect Resume Screener</h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">Platform Engineer Position</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Left Panel: Upload + History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Card */}
              <Card className="border border-border/60 shadow-md bg-white/90 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FiUpload className="w-4 h-4 text-primary" />
                    Upload Your Resume
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Submit your resume to check how well it matches the Platform Engineer position
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {/* Error Banner */}
                  {errorMessage && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-3">
                  {screeningResult && !isScreening ? (
                    <Button
                      onClick={handleUploadNew}
                      variant="outline"
                      className="w-full"
                    >
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Screen Another Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={handleScreen}
                      disabled={!selectedFile || isScreening}
                      className="w-full"
                    >
                      {isScreening ? (
                        <>
                          <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FiActivity className="w-4 h-4 mr-2" />
                          Check My Resume
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Recent Checks */}
              {history.length > 0 && (
                <Card className="border border-border/60 shadow-md bg-white/90 backdrop-blur-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FiClock className="w-4 h-4 text-primary" />
                      Recent Checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[280px]">
                      <div className="space-y-2">
                        {history.map((entry) => {
                          const entryIsPass = entry.overallScore >= FIT_THRESHOLD
                          return (
                            <button
                              key={entry.id}
                              onClick={() => handleHistoryClick(entry)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left border border-transparent hover:border-border/60"
                            >
                              <div
                                className={cn(
                                  'p-1.5 rounded-full shrink-0',
                                  entryIsPass ? 'bg-green-100' : 'bg-amber-100'
                                )}
                              >
                                {entryIsPass ? (
                                  <FiCheck className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <FiHeart className="w-3.5 h-3.5 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {entry.candidateName}
                                </p>
                                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs shrink-0',
                                  entryIsPass ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                )}
                              >
                                {entry.overallScore}%
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Status Indicator */}
              <Card className="border border-border/60 shadow-sm bg-white/70 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-1.5 rounded-full', activeAgentId ? 'bg-green-100' : 'bg-muted')}>
                      <FiActivity
                        className={cn(
                          'w-3.5 h-3.5',
                          activeAgentId ? 'text-green-600 animate-pulse' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">AI Screening Engine</p>
                      <p className="text-xs text-muted-foreground">
                        {activeAgentId ? 'Analyzing your resume...' : 'Ready to screen'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {activeAgentId ? 'Active' : 'Ready'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel: Results */}
            <div className="lg:col-span-3">
              <Card className="border border-border/60 shadow-md bg-white/90 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-primary" />
                    Your Results
                  </CardTitle>
                  <CardDescription className="text-xs">
                    See how well your resume matches the role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isScreening ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <FiRefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Analyzing your resume...</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            This usually takes a moment. Hang tight!
                          </p>
                        </div>
                      </div>
                      <LoadingSkeleton />
                    </div>
                  ) : screeningResult ? (
                    <ResultsDisplay data={screeningResult} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <FiUpload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Ready to check your fit?</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Upload your resume (PDF or DOCX) and we will instantly
                        analyze how well it matches the Platform Engineer position.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
