// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to the mask path for OneNativeEdgeFade. see VENDORING.md.
#import "OneNativeEdgeFadeCurves.h"

// ─── Preset tables ────────────────────────────────────────────────────────────
//
// 32-stop preset curves computed once via dispatch_once. Dense stops eliminate
// visible banding at any fade size.
//
//   smooth    → (1−t)³                    sharp  → (1−t)⁵
//   gentle    → (1−t)²                    soft   → cos(t·π/2)
//   smoother  → smootherstep 6t⁵−15t⁴+10t³
//   linear    → kept as a 2-stop array (1, 0) since the curve is exact.

static const int     kN              = 32;
static const CGFloat kTwoStops[2]    = {0, 1.0};
static const CGFloat kLinearAlphas[2] = {1, 0};

static CGFloat sSmoothAlphas[32], sSharpAlphas[32], sGentleAlphas[32], sSoftAlphas[32], sSmootherAlphas[32];
static CGFloat sNStops[32];

static void computePresetCurves(void) {
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    for (int i = 0; i < kN; i++) {
      CGFloat t        = (CGFloat)i / (kN - 1);
      sNStops[i]       = t;
      sSmoothAlphas[i] = pow(1 - t, 3);
      sSharpAlphas[i]  = pow(1 - t, 5);
      sGentleAlphas[i] = pow(1 - t, 2);
      sSoftAlphas[i]   = cos(t * M_PI_2);
      sSmootherAlphas[i] = 1 - (t * t * t * (t * (t * 6 - 15) + 10));
    }
  });
}

static void presetCurveData(NSString *curve,
                            const CGFloat **alphasOut,
                            const CGFloat **stopsOut,
                            size_t *countOut)
{
  computePresetCurves();
  if      ([curve isEqualToString:@"sharp"])  { *alphasOut = sSharpAlphas;  *stopsOut = sNStops;    *countOut = kN; }
  else if ([curve isEqualToString:@"gentle"]) { *alphasOut = sGentleAlphas; *stopsOut = sNStops;    *countOut = kN; }
  else if ([curve isEqualToString:@"soft"])   { *alphasOut = sSoftAlphas;   *stopsOut = sNStops;    *countOut = kN; }
  else if ([curve isEqualToString:@"smoother"]) { *alphasOut = sSmootherAlphas; *stopsOut = sNStops; *countOut = kN; }
  else if ([curve isEqualToString:@"linear"]) { *alphasOut = kLinearAlphas; *stopsOut = kTwoStops;  *countOut = 2;  }
  else                                        { *alphasOut = sSmoothAlphas; *stopsOut = sNStops;    *countOut = kN; }
}

// ─── Custom curve parsing ─────────────────────────────────────────────────────

BOOL OneNativeEdgeFadeCurveIsCustom(NSString *curve) {
  return [curve containsString:@","];
}

// Returns heap-allocated buffers on success; caller must free().
// Returns NO and leaves buffers nil on parse failure.
static BOOL parseCustomCurve(NSString *curve,
                             CGFloat **alphasOut,
                             CGFloat **stopsOut,
                             size_t *countOut)
{
  NSArray<NSString *> *parts = [curve componentsSeparatedByString:@","];
  NSUInteger n = parts.count;
  if (n < 2) return NO;

  CGFloat *alphas = (CGFloat *)malloc(n * sizeof(CGFloat));
  CGFloat *stops  = (CGFloat *)malloc(n * sizeof(CGFloat));
  for (NSUInteger i = 0; i < n; i++) {
    alphas[i] = [parts[i] doubleValue];
    stops[i]  = (CGFloat)i / (n - 1);
  }
  *alphasOut = alphas; *stopsOut = stops; *countOut = n;
  return YES;
}

void OneNativeEdgeFadeResolveCurve(NSString *curve,
                                   const CGFloat **alphas,
                                   const CGFloat **stops,
                                   size_t *count,
                                   CGFloat **dynAlphas,
                                   CGFloat **dynStops)
{
  *dynAlphas = NULL; *dynStops = NULL;
  if (OneNativeEdgeFadeCurveIsCustom(curve) && parseCustomCurve(curve, dynAlphas, dynStops, count)) {
    *alphas = *dynAlphas; *stops = *dynStops;
    return;
  }
  presetCurveData(OneNativeEdgeFadeCurveIsCustom(curve) ? @"smooth" : curve, alphas, stops, count);
}
