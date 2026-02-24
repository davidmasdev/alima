import * as React from "react"
import Svg, {
  SvgProps,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Text,
} from "react-native-svg"
const LogoSVG = (props: SvgProps) => (
  <Svg xmlns="http://www.w3.org/2000/svg" width={300} height={120} {...props}>
    <Defs>
      <LinearGradient id="a" x1="0%" x2="100%" y1="0%" y2="100%">
        <Stop
          offset="0%"
          style={{
            stopColor: "#1b5e20",
            stopOpacity: 1,
          }}
        />
        <Stop
          offset="100%"
          style={{
            stopColor: "#43a047",
            stopOpacity: 1,
          }}
        />
      </LinearGradient>
    </Defs>
    <Rect width={96} height={96} x={10} y={12} fill="url(#a)" rx={22} ry={22} />
    <Path stroke="#fff" strokeLinecap="round" strokeWidth={3} d="M58 88V52" />
    <Path fill="#fff" d="M58 68s-20-6-22-22c0 0 18-2 22 14" opacity={0.9} />
    <Path
      fill="#fff"
      d="M58 60c4-16 22-14 22-14-2 16-22 22-22 22"
      opacity={0.75}
    />
    <Circle cx={58} cy={48} r={5} fill="#fff" opacity={0.95} />
  </Svg>
)
export default LogoSVG
