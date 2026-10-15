"""Render three original, seamless scores; no samples or external music assets."""
from pathlib import Path
import argparse, math, subprocess, wave
import numpy as np

SR = 32000
def frequency(midi): return 440 * 2 ** ((midi-69)/12)

def compose(track, bpm, darker=False, combat=False):
    beat=60/bpm; duration=16*4*beat; length=round(duration*SR)
    out=np.zeros((length,2),np.float64); random=np.random.default_rng(2180+len(track))
    chords=[(45,52,57,60),(41,48,53,57),(48,55,60,64),(43,50,55,59),(45,52,57,60),(41,48,53,57),(38,45,50,53),(40,47,52,55)]
    if darker: chords=[(38,45,50,53),(34,41,46,50),(41,48,53,57),(36,43,48,52)]*2
    if combat: chords=[(38,45,50,53),(38,45,50,53),(34,41,46,50),(36,43,48,52)]*2
    def mix(sound,start,volume=1,pan=0):
        indices=(round(start*SR)+np.arange(len(sound)))%length
        left=math.sqrt((1-pan)/2); right=math.sqrt((1+pan)/2)
        np.add.at(out[:,0],indices,sound*volume*left);np.add.at(out[:,1],indices,sound*volume*right)
    def pluck(note,duration=2.6,brightness=1):
        t=np.arange(round(SR*duration))/SR;f=frequency(note);signal=np.zeros(len(t))
        for harmonic in range(1,13):
            signal+=np.sin(2*np.pi*f*harmonic*t+harmonic*.16)*np.exp(-t*(1.0+harmonic*.36))/(harmonic**(1.6/brightness))
        attack=np.minimum(1,t/.006);body=.09*np.sin(2*np.pi*110*t)*np.exp(-t*15)
        return (signal+body)*attack*.34
    def pad(notes,duration):
        t=np.arange(round(SR*duration))/SR;env=np.minimum(1,t/.7)*np.minimum(1,(duration-t)/1.0);signal=np.zeros(len(t))
        for note in notes:
            f=frequency(note);signal+=(np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*f*2*t)+.25*np.sin(2*np.pi*f*1.003*t))*.08
        return signal*env
    def lead(note,duration):
        t=np.arange(round(SR*duration))/SR;f=frequency(note);phase=2*np.pi*f*t+.012*np.sin(2*np.pi*4.5*t);env=np.minimum(1,t/.1)*np.minimum(1,(duration-t)/.25)
        return (np.sin(phase)+.25*np.sin(phase*2)+.08*np.sin(phase*3))*env*.20
    def drum(kind):
        duration=.5 if kind=='kick' else .20;t=np.arange(round(SR*duration))/SR
        if kind=='kick':return np.sin(2*np.pi*(48*t+4*(1-np.exp(-t*30))))*np.exp(-t*12)*.65
        noise=random.normal(0,1,len(t));noise=np.convolve(noise,[.2,.6,.2],mode='same')
        if kind=='brush':return noise*np.exp(-t*24)*.16
        return np.diff(noise,prepend=0)*np.exp(-t*55)*.07
    for bar in range(16):
        chord=chords[bar%8];start=bar*4*beat
        mix(pad([n+12 for n in chord],5*beat),start,.60 if combat else .8,-.12)
        pattern=[1,2,3,2,0,2,3,1] if not combat else [0,1,2,1,0,2,1,3]
        for step,index in enumerate(pattern):
            note=chord[index]+12
            mix(pluck(note,2.5,.92 if darker else 1.05),start+step*.5*beat,.68 if combat else .92,(-.3 if step%2==0 else .3))
            if not combat:mix(pluck(note,2,.9),start+step*.5*beat+.14*beat,.13,-.45)
        for step in [0,2]:mix(pluck(chord[0]-12,2.1,.72),start+step*beat,.8,0)
        for step in [0,2]:mix(drum('kick'),start+step*beat,.72 if combat else .28)
        for step in [1,3]:mix(drum('brush'),start+step*beat,.95 if combat else .40,.10)
        for step in range(8):mix(drum('hat'),start+step*.5*beat,.7 if combat else .25,-.25)
        melody=[69,72,76,72,67,64,65,67] if not darker else [62,65,69,65,60,57,58,60]
        if bar%2==0 and not combat:
            mix(lead(melody[bar%8],beat*1.45),start+beat*.2,.5,-.15)
            mix(lead(melody[(bar+1)%8],beat*1.4),start+beat*2.2,.45,.15)
        if combat:
            for step in range(4):mix(pluck(chord[0],.9,.85),start+step*beat+.25*beat,.45,0)
    # A circular early-reflection room preserves the loop seam.
    dry=out.copy()
    for seconds,level in [(.087,.13),(.173,.11),(.311,.08),(.523,.06),(.791,.035)]:
        delayed=np.roll(dry,round(seconds*SR),axis=0);out+=delayed[:,::-1]*level
    out=np.tanh(out*.92);out*=.86/max(.001,np.max(np.abs(out)))
    return np.int16(out*32767),duration

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--wavdir',required=True);args=parser.parse_args()
    work=Path(args.wavdir);work.mkdir(parents=True,exist_ok=True);target=Path(__file__).resolve().parents[1]/'dist'/'music';target.mkdir(exist_ok=True)
    for name,bpm,darker,combat in [('outer-reach',84,False,False),('quiet-iron',76,True,False),('red-contact',112,True,True)]:
        audio,duration=compose(name,bpm,darker,combat);wav=work/(name+'.wav')
        with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(audio.tobytes())
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(target/(name+'.mp3'))],check=True)
        print(f'{name}: {duration:.1f}s original stereo score',flush=True)
