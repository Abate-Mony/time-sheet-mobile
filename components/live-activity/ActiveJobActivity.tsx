// iOS Live Activity for a shift in progress — the lock screen / Dynamic
// Island counterpart of the Android ongoing notification
// (modules/active-job-notification). Driven by the same reconcile logic in
// services/activeJobNotification.ts; only imported on iOS (see the lazy
// require there), since this module touches expo-widgets' native side.
//
// The 'widget' function below is stringified at build time and runs in an
// isolated widget runtime: it can only use @expo/ui/swift-ui components and
// modifiers by their imported names, and every constant/helper has to live
// inside it — no module-scope values, hooks or async work.
//
// The elapsed timer and progress bar are SwiftUI timerInterval views, so
// iOS ticks them itself; the app doesn't need to be running to keep them
// current. Only state changes (e.g. going into overtime) need an update().
import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers'
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets'

// Props cross the bridge via JSON.stringify, so times are epoch ms, not Dates.
export type ActiveJobActivityProps = {
  title: string
  subtitle: string
  checkedInAtMs: number
  // Same rule as computeJobProgress: progress is elapsed time against the
  // scheduled duration, measured from clock-in. null = no reliable duration.
  progressEndAtMs: number | null
  scheduledEndAtMs: number | null
  isOvertime: boolean
}

const ActiveJobActivity = (props: ActiveJobActivityProps, environment: LiveActivityEnvironment) => {
  'widget'
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : '#60A5FA'
  const warning = '#F59E0B'
  const secondary = environment.colorScheme === 'dark' ? '#94A3B8' : '#64748B'

  const checkedIn = new Date(props.checkedInAtMs)
  // Upper bound for a count-up timer — far enough out that no shift reaches it.
  const elapsed = { lower: checkedIn, upper: new Date(props.checkedInAtMs + 24 * 60 * 60 * 1000) }
  const progress = props.progressEndAtMs
    ? { lower: checkedIn, upper: new Date(props.progressEndAtMs) }
    : null
  const statusColor = props.isOvertime ? warning : accent
  const statusLabel = props.isOvertime ? 'Overtime' : 'On shift'

  const timer = (size: number) => (
    <Text
      timerInterval={elapsed}
      countsDown={false}
      modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle(statusColor)]}
    />
  )

  const progressBar = progress ? (
    <ProgressView
      timerInterval={progress}
      countsDown={false}
      modifiers={[progressViewStyle('linear'), tint(statusColor)]}
    />
  ) : null

  const endLine = props.scheduledEndAtMs ? (
    <HStack spacing={4}>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(props.isOvertime ? warning : secondary)]}>
        {props.isOvertime ? 'Past scheduled end' : 'Ends'}
      </Text>
      <Text
        date={new Date(props.scheduledEndAtMs)}
        dateStyle="time"
        modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(props.isOvertime ? warning : secondary)]}
      />
    </HStack>
  ) : null

  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Image systemName="clock.fill" color={statusColor} size={16} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(statusColor)]}>{statusLabel}</Text>
          <Spacer />
          {timer(22)}
        </HStack>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 16, weight: 'bold' })]}>{props.title}</Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>{props.subtitle}</Text>
        </VStack>
        {progressBar}
        {endLine}
      </VStack>
    ),
    compactLeading: <Image systemName="clock.fill" color={statusColor} />,
    compactTrailing: (
      <Text
        timerInterval={elapsed}
        countsDown={false}
        modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit(), foregroundStyle(statusColor), frame({ maxWidth: 64 })]}
      />
    ),
    minimal: <Image systemName="clock.fill" color={statusColor} />,
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 4 })]}>
        <Image systemName="clock.fill" color={statusColor} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(statusColor)]}>{statusLabel}</Text>
      </HStack>
    ),
    expandedTrailing: timer(18),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 4, bottom: 4 })]}>
        <Text modifiers={[font({ size: 15, weight: 'bold' })]}>{props.title}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>{props.subtitle}</Text>
        {progressBar}
        {endLine}
      </VStack>
    ),
  }
}

export default createLiveActivity('ActiveJobActivity', ActiveJobActivity)
