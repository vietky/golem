package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitLogger initializes the global logger
func InitLogger(development bool) error {
	var cfg zap.Config
	
	if development {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		cfg = zap.NewProductionConfig()
	}
	
	var err error
	Log, err = cfg.Build()
	if err != nil {
		return err
	}
	
	return nil
}

// Sync flushes any buffered log entries
func Sync() {
	if Log != nil {
		Log.Sync()
	}
}

// GetLogger returns the global logger (creates one if not initialized)
func GetLogger() *zap.Logger {
	if Log == nil {
		// Fallback to development logger
		Log, _ = zap.NewDevelopment()
	}
	return Log
}
