import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./RobotPet.css";

const MAX_EYE_OFFSET = 7;
const IDLE_SLEEP_DELAY = 10000;
const AUTO_WAVE_DELAY = 5000;
const WAVE_TRICK = "is-waving";
export const ROBOT_PET_EVENT =
  "documind:robot-pet-action";
const TRICKS = [
  "is-spinning",
  "is-hopping",
  "is-wobbling",
  "is-surprised",
  "is-angry",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sleepingEyeOffset() {
  return {
    x: 0,
    y: 4,
  };
}

function RobotPet({
  autoWave = false,
  canSleep = true,
  className = "",
  listenForDashboardEvents = false,
  trackCursor = true,
}) {
  const petRef = useRef(null);
  const idleTimerRef = useRef(null);
  const trickTimerRef = useRef(null);
  const waveTimerRef = useRef(null);
  const trickIndexRef = useRef(0);

  const [eyeOffset, setEyeOffset] =
    useState({
      x: 0,
      y: 0,
    });
  const [isSleeping, setIsSleeping] =
    useState(false);
  const [trickClass, setTrickClass] =
    useState("");
  const [outerActionClass, setOuterActionClass] =
    useState("");
  const [outerStyle, setOuterStyle] =
    useState(undefined);

  useEffect(() => {
    function sendToSleep() {
      if (!canSleep) {
        return;
      }

      setIsSleeping(true);
      setEyeOffset(sleepingEyeOffset());
    }

    function queueSleep() {
      if (!canSleep) {
        return;
      }

      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current =
        window.setTimeout(
          sendToSleep,
          IDLE_SLEEP_DELAY
        );
    }

    function handlePointerMove(event) {
      const pet = petRef.current;

      if (!pet) {
        return;
      }

      const bounds =
        pet.getBoundingClientRect();
      const centerX =
        bounds.left + bounds.width / 2;
      const centerY =
        bounds.top + bounds.height / 2;

      setEyeOffset({
        x: clamp(
          (event.clientX - centerX) / 26,
          -MAX_EYE_OFFSET,
          MAX_EYE_OFFSET
        ),
        y: clamp(
          (event.clientY - centerY) / 30,
          -MAX_EYE_OFFSET,
          MAX_EYE_OFFSET
        ),
      });
      setIsSleeping(false);
      queueSleep();
    }

    if (!trackCursor) {
      return undefined;
    }

    queueSleep();
    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    return () => {
      window.clearTimeout(idleTimerRef.current);
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );
    };
  }, [canSleep, trackCursor]);

  useEffect(
    () => () => {
      window.clearTimeout(trickTimerRef.current);
    },
    []
  );

  const startTrick = useCallback(
    (nextTrick) => {
      window.clearTimeout(trickTimerRef.current);
      window.clearTimeout(idleTimerRef.current);
      setIsSleeping(false);
      setTrickClass(nextTrick);
      trickTimerRef.current =
        window.setTimeout(() => {
          setTrickClass("");
        }, 1200);

      if (canSleep) {
        idleTimerRef.current =
          window.setTimeout(() => {
            setIsSleeping(true);
            setEyeOffset(sleepingEyeOffset());
          }, IDLE_SLEEP_DELAY);
      }
    },
    [canSleep]
  );

  useEffect(() => {
    if (!autoWave) {
      return undefined;
    }

    waveTimerRef.current =
      window.setInterval(() => {
        startTrick(WAVE_TRICK);
      }, AUTO_WAVE_DELAY);

    return () => {
      window.clearInterval(waveTimerRef.current);
    };
  }, [autoWave, startTrick]);

  useEffect(() => {
    if (!listenForDashboardEvents) {
      return undefined;
    }

    function handleRobotAction(event) {
      const action = event.detail?.action;

      if (action === "profile-open") {
        setOuterActionClass("is-menu-peeking");
        startTrick(WAVE_TRICK);
        return;
      }

      if (action === "profile-close") {
        setOuterActionClass("");
        return;
      }

      if (action === "goodbye") {
        setOuterActionClass(
          "is-menu-peeking is-teleporting-away"
        );
        startTrick(WAVE_TRICK);
        return;
      }

      if (action === "workspace-dive") {
        const targetRect = event.detail?.targetRect;
        const petBounds =
          petRef.current?.getBoundingClientRect();

        if (!targetRect || !petBounds) {
          return;
        }

        const targetCenterX =
          targetRect.left + targetRect.width / 2;
        const targetCenterY =
          targetRect.top + targetRect.height / 2;
        const petCenterX =
          petBounds.left + petBounds.width / 2;
        const petCenterY =
          petBounds.top + petBounds.height / 2;

        setOuterStyle({
          "--workspace-dive-x": `${targetCenterX - petCenterX}px`,
          "--workspace-dive-y": `${targetCenterY - petCenterY}px`,
        });
        setOuterActionClass(
          "is-diving-into-workspace"
        );
      }
    }

    window.addEventListener(
      ROBOT_PET_EVENT,
      handleRobotAction
    );

    return () => {
      window.removeEventListener(
        ROBOT_PET_EVENT,
        handleRobotAction
      );
    };
  }, [listenForDashboardEvents, startTrick]);

  function handleClick() {
    const nextTrick =
      TRICKS[
        trickIndexRef.current % TRICKS.length
      ];

    trickIndexRef.current += 1;
    startTrick(nextTrick);
  }

  const petStateClasses = [
    "robot-pet",
    isSleeping ? "is-sleeping" : "",
    trickClass,
  ]
    .filter(Boolean)
    .join(" ");

  const pupilStyle = isSleeping
    ? undefined
    : {
        "--eye-x": `${eyeOffset.x}px`,
        "--eye-y": `${eyeOffset.y}px`,
      };

  return (
    <button
      ref={petRef}
      className={[
        "robot-pet-button",
        className,
        outerActionClass,
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-label="Play with the dashboard robot pet"
      onClick={handleClick}
      style={outerStyle}
    >
      <span className={petStateClasses}>
        <span className="robot-pet-shadow" />
        <span className="robot-pet-antenna">
          <span />
        </span>
        <span className="robot-pet-head">
          <span className="robot-pet-ear left" />
          <span className="robot-pet-ear right" />
          <span className="robot-pet-face">
            <span className="robot-pet-eye left">
              <span
                className="robot-pet-pupil"
                style={pupilStyle}
              />
            </span>
            <span className="robot-pet-eye right">
              <span
                className="robot-pet-pupil"
                style={pupilStyle}
              />
            </span>
            <span className="robot-pet-brow left" />
            <span className="robot-pet-brow right" />
            <span className="robot-pet-mouth" />
          </span>
        </span>
        <span className="robot-pet-body">
          <span className="robot-pet-core" />
          <span className="robot-pet-arm left" />
          <span className="robot-pet-arm right" />
          <span className="robot-pet-leg left" />
          <span className="robot-pet-leg right" />
        </span>
        <span className="robot-pet-sleep">
          <span>Z</span>
          <span>Z</span>
          <span>Z</span>
        </span>
      </span>
    </button>
  );
}

export default RobotPet;
