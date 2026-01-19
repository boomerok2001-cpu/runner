"use client";

import { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";
import "./game.css";

export default function Game() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setContext(await sdk.context);
        sdk.actions.ready();
      } catch (e) {
        console.log("Running outside Farcaster frame");
      }
      setIsSDKLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!isSDKLoaded) return;

    // Load Three.js first
    const threeScript = document.createElement("script");
    threeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    threeScript.onload = () => {
      // Then load game script
      const gameScript = document.createElement("script");
      gameScript.src = "/game.js";
      document.body.appendChild(gameScript);
    };
    document.body.appendChild(threeScript);

    return () => {
      // Cleanup on unmount
    };
  }, [isSDKLoaded]);

  if (!isSDKLoaded) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div id="game-container">
        <canvas id="gameCanvas"></canvas>

        {/* HUD */}
        <div id="hud">
          <div id="coins-display">
            <div className="money-icon">$</div>
            <span id="coin-count">0</span>
          </div>
          <div id="kids-display">
            <div className="kids-icon">ðŸ‘¦</div>
            <span id="kids-count">0</span>
          </div>
          <div id="distance-display">
            <span id="distance">0</span>m
          </div>
          <div id="score-display">
            <span id="score">0</span>
          </div>
        </div>

        {/* El Presidente Distance Indicator */}
        <div id="chaser-distance">
          <div className="chaser-icon">âš–ï¸</div>
          <span id="chaser-dist">15</span>m
          <div className="danger-bar">
            <div className="danger-fill" id="danger-fill"></div>
          </div>
        </div>

        {/* Intro Animation */}
        <div id="intro-animation" className="hidden">
          <div className="intro-content">
            <div className="intro-text" id="intro-text">EL PRESIDENTE IS COMING!</div>
          </div>
        </div>

        {/* Main Menu Screen with Tabs */}
        <div id="start-screen" className="overlay">
          <div className="menu-container">
            {/* Game Logo */}
            <div className="logo-section">
              <h1 className="game-title">RUN FROM EL PRESIDENTE</h1>
              <p className="tagline">Can you escape the dictator&apos;s grasp?</p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-nav">
              <button className="tab-btn active" data-tab="play">
                <span className="tab-icon">ðŸŽ®</span>
                <span className="tab-text">PLAY</span>
              </button>
              <button className="tab-btn" data-tab="leaderboard">
                <span className="tab-icon">ðŸ†</span>
                <span className="tab-text">SCORES</span>
              </button>
              <button className="tab-btn" data-tab="settings">
                <span className="tab-icon">âš™ï¸</span>
                <span className="tab-text">SETTINGS</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {/* PLAY TAB */}
              <div className="tab-panel active" id="tab-play">
                <h2 className="section-title">SELECT YOUR RUNNER</h2>
                <div className="character-select">
                  <button className="char-btn" data-char="runner1">
                    <div className="char-avatar runner1-avatar"></div>
                    <span className="char-name">Runner 1</span>
                    <span className="char-desc">Speed Bonus</span>
                  </button>
                  <button className="char-btn" data-char="runner2">
                    <div className="char-avatar runner2-avatar"></div>
                    <span className="char-name">Runner 2</span>
                    <span className="char-desc">Coin Bonus</span>
                  </button>
                  <button className="char-btn" data-char="runner3">
                    <div className="char-avatar runner3-avatar"></div>
                    <span className="char-name">Runner 3</span>
                    <span className="char-desc">Shield Bonus</span>
                  </button>
                </div>

                <div className="controls-info">
                  <div className="control-group">
                    <span className="key">A</span><span className="key">D</span>
                    <span className="control-label">Dodge</span>
                  </div>
                  <div className="control-group">
                    <span className="key">W</span><span className="key">SPACE</span>
                    <span className="control-label">Jump</span>
                  </div>
                  <div className="control-group">
                    <span className="key">S</span><span className="key">SHIFT</span>
                    <span className="control-label">Slide</span>
                  </div>
                </div>
              </div>

              {/* LEADERBOARD TAB */}
              <div className="tab-panel" id="tab-leaderboard">
                <h2 className="section-title">HIGH SCORES</h2>
                <div className="leaderboard">
                  <div className="leaderboard-header">
                    <span>RANK</span>
                    <span>SCORE</span>
                    <span>DISTANCE</span>
                  </div>
                  <div className="leaderboard-row gold">
                    <span className="rank">ðŸ¥‡</span>
                    <span className="lb-score" id="lb-score-1">---</span>
                    <span className="lb-dist" id="lb-dist-1">---</span>
                  </div>
                  <div className="leaderboard-row silver">
                    <span className="rank">ðŸ¥ˆ</span>
                    <span className="lb-score" id="lb-score-2">---</span>
                    <span className="lb-dist" id="lb-dist-2">---</span>
                  </div>
                  <div className="leaderboard-row bronze">
                    <span className="rank">ðŸ¥‰</span>
                    <span className="lb-score" id="lb-score-3">---</span>
                    <span className="lb-dist" id="lb-dist-3">---</span>
                  </div>
                  <div className="leaderboard-row">
                    <span className="rank">4</span>
                    <span className="lb-score" id="lb-score-4">---</span>
                    <span className="lb-dist" id="lb-dist-4">---</span>
                  </div>
                  <div className="leaderboard-row">
                    <span className="rank">5</span>
                    <span className="lb-score" id="lb-score-5">---</span>
                    <span className="lb-dist" id="lb-dist-5">---</span>
                  </div>
                </div>
                <button className="secondary-btn" id="clear-scores-btn">CLEAR SCORES</button>
              </div>

              {/* SETTINGS TAB */}
              <div className="tab-panel" id="tab-settings">
                <h2 className="section-title">SETTINGS</h2>
                <div className="settings-list">
                  <div className="setting-row">
                    <span className="setting-label">Graphics Quality</span>
                    <div className="setting-control">
                      <button className="option-btn active" data-quality="low">LOW</button>
                      <button className="option-btn" data-quality="medium">MED</button>
                      <button className="option-btn" data-quality="high">HIGH</button>
                    </div>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Sound Effects</span>
                    <div className="setting-control">
                      <button className="toggle-btn active" id="sound-toggle">ON</button>
                    </div>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Music</span>
                    <div className="setting-control">
                      <button className="toggle-btn" id="music-toggle">OFF</button>
                    </div>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Show FPS</span>
                    <div className="setting-control">
                      <button className="toggle-btn" id="fps-toggle">OFF</button>
                    </div>
                  </div>
                </div>
                <p className="version-text">Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Over Screen */}
        <div id="gameover-screen" className="overlay hidden">
          <div className="gameover-container">
            <h1 className="game-over-title">YOU GOT CAUGHT</h1>
            <div className="handcuffs-icon">â›“ï¸</div>
            <p className="caught-text" id="caught-text">You&apos;ve been caught!</p>
            <div className="final-stats">
              <div className="stat-row">
                <span className="stat-label">Distance</span>
                <span className="stat-value"><span id="final-distance">0</span>m</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Money</span>
                <span className="stat-value">$<span id="final-coins">0</span></span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Kids</span>
                <span className="stat-value"><span id="final-kids">0</span></span>
              </div>
              <div className="stat-row highlight">
                <span className="stat-label">SCORE</span>
                <span className="stat-value score-value"><span id="final-score">0</span></span>
              </div>
              <div className="stat-row best">
                <span className="stat-label">Best Run</span>
                <span className="stat-value"><span id="high-score">0</span></span>
              </div>
            </div>
            <div className="gameover-buttons">
              <button id="restart-btn" className="justice-btn">PLAY AGAIN</button>
              <button id="menu-btn" className="secondary-btn">MAIN MENU</button>
            </div>
          </div>
        </div>

        {/* Pause indicator */}
        <div id="pause-indicator" className="hidden">PAUSED</div>
      </div>
    </>
  );
}
