#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Apr 24 23:29:45 2023

@author: mimfar
"""


import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.signal.windows import get_window, taylor, chebwin

from collections.abc import Iterable
from collections import namedtuple
from functools import partial
import matplotlib
from matplotlib import cm,ticker
import mpl_toolkits
 

PI = np.pi

def db(m,x):
    return m * np.log10(np.abs(x))

db10 = partial(db,10)
db20 = partial(db,20)
    

class PlanarArray():
    ''' The class construct a planr antenna array object'''
    
    Version = '0.1'
    
    def __init__(self,array_shape,scan_angle=(0,0),theta=[],phi=[],element_pattern=True,window=None,SLL=None):
        
        '''AF_calc calculates the Array Factor (AF) of a planar antenna array with either rect or tri grids
        
        num_elem              : a tuple of  # of elements in rows and columns
        scan_angle (deg): a tuple of angels (theta_scan,phi_scan) A progressive phase shift will 
                          be applied to array elements to scan the beam to scan angle
        theta (deg), phi(deg)  : spatial angle theta:0-180,phi=0-360 with  braodside=(0,0)
        element_pattern : Applies cosine envelope on top of the array factor
        '''

        if array_shape[0] in ['rect','tri']:
            self.shape = array_shape[0]
            num_elem = array_shape[1]
            element_spacing = array_shape[2]
            assert num_elem[0] > 0 , ('array length can not be zero')
            assert num_elem[1] > 0 , ('array length can not be zero')
            self.num_elem = num_elem
            self.element_spacing = element_spacing
            self.row = np.linspace(0,self.num_elem[0]-1,self.num_elem[0]) * self.element_spacing[0]
            self.col = np.linspace(0,self.num_elem[1]-1,self.num_elem[1]) * self.element_spacing[1]
            [self.Y,self.X] = np.meshgrid(self.row,self.col)
            d_={'rect':0,'tri':0.5}
            self.X[:,0::2] = self.X[:,0::2] + d_[self.shape] * self.element_spacing[1]
            self.X = self.X.reshape(-1,)
            self.Y = self.Y.reshape(-1,)

        elif array_shape[0] == 'circ':
            self.shape = 'circ'
            self.num_elem = array_shape[1]
            self.radius = array_shape[2]
            self.array_size = sum(self.num_elem)
            self.X = np.array([])
            self.Y = np.array([])

            for idx, n in enumerate(self.num_elem):
                ang = np.linspace(0,2*np.pi,n+1)
                self.X = np.concatenate((self.X,self.radius[idx] * np.cos(ang[:-1])))
                self.Y = np.concatenate((self.Y,self.radius[idx] * np.sin(ang[:-1])))

                
        elif array_shape[0] =='other':
            self.shape = 'other'
            self.X = array_shape[1].reshape(-1,)
            self.Y = array_shape[2].reshape(-1,)
            self.array_size = len(self.X)
        else:
            raise Exception(f'{array_shape[0]} is not a valid planar array shape ')
            
        
        self.scan_angle = scan_angle
        self.theta = theta
        self.phi = phi
        self.element_pattern = element_pattern
        self.window = window
        self.SLL = SLL
        
        array_length = np.sqrt((np.max(self.X) - np.min(self.X))**2 + (np.max(self.Y) - np.min(self.Y))**2)
        if not any(self.theta):
            HPBW = 51 / array_length
            Nt = int(180 / (HPBW / 4))
            Nt = Nt + (Nt+1) % 2 # making Nt an odd number
            Nt = max(Nt,181) # 181 point is at least 1 degree theta resolution
            self.theta = np.linspace(0,180,Nt)
        if not any(self.phi):
            self.phi = np.linspace(0,360,2 * Nt-1)
        
    # @classmethod
    # def from_element_position(cls,X,**kwargs):
    #     return cls(len(X),np.diff(sorted(X)),**kwargs)
        
    @property
    def calc_AF(self):
        
        if self.shape == 'rect':
 
            
            self.row_ = np.reshape(self.row,(-1,1,1))   
            self.col_ = np.reshape(self.col,(-1,1,1))        
    
    
            self.Pcol = -2 * PI * self.col_ * np.sin(np.radians(self.scan_angle[0])) * np.cos(np.radians(self.scan_angle[1])) 
            self.Prow = -2 * PI * self.row_ * np.sin(np.radians(self.scan_angle[0])) * np.sin(np.radians(self.scan_angle[1])) 
            
            self.Icol = np.ones(self.col_.shape)
            self.Irow = np.ones(self.row_.shape)
    
            if self.window:
                self.Icol = get_window(self.window, self.num_elem[1]).reshape(self.col_.shape)
                self.Irow = get_window(self.window, self.num_elem[0]).reshape(self.row_.shape)
            if self.SLL:
                if self.SLL < 50:
                    self.Icol = taylor(self.num_elem[1], nbar=5, sll=self.SLL).reshape(self.col_.shape)
                    self.Irow = taylor(self.num_elem[0], nbar=5, sll=self.SLL).reshape(self.row_.shape)
                else:
                    self.Icol = chebwin(self.num_elem[1], self.SLL).reshape(self.col_.shape)
                    self.Irow = chebwin(self.num_elem[0], self.SLL).reshape(self.row_.shape)
            
     
            self.AF = self.calc_AF_rect()     
        else:
            self.AF = self.calc_AF_()
           
        return self.AF  
        


    def calc_AF_rect(self):
        theta = self.theta.reshape(1,-1)
        phi = self.phi.reshape(-1,1)
        CPST = np.matmul(np.cos(phi * PI/180),np.sin(theta * PI/180))
        SPST = np.matmul(np.sin(phi * PI/180),np.sin(theta * PI/180))

        AFrow = np.sum(self.Irow * np.exp(1j * self.Prow + 1j * 2 * np.pi * np.tensordot(self.row,SPST,axes = 0)),axis=0)
        AFcol = np.sum(self.Icol * np.exp(1j * self.Pcol + 1j * 2 * np.pi * np.tensordot(self.col,CPST,axes = 0)),axis=0)
        AF = AFrow * AFcol
        T = np.tile(theta,(len(phi),1))
        cos_theta = np.cos(np.radians(T))
        cos_theta[T>89] = np.cos(np.radians(89.0))
        
        if self.element_pattern:
            AF = AF * cos_theta

        delta_theta = (self.theta[1] - self.theta[0]) * np.pi / 180
        delta_phi= (phi[1] - phi[0]) * np.pi / 180
            
        AF_int =  np.sum(np.abs(AF)**2 * np.sin(np.radians(T))) * delta_theta * delta_phi / 4 / PI # integral of AF^2
        AF = AF/ (AF_int ** 0.5)
        
        return AF

    def calc_AF_ (self):
        theta = self.theta.reshape(1,-1)
        phi = self.phi.reshape(-1,1)
        XCPST = np.tensordot(self.X,np.matmul(np.cos(phi * PI/180),np.sin(theta * PI/180)),axes=0)
        YSPST = np.tensordot(self.Y,np.matmul(np.sin(phi * PI/180),np.sin(theta * PI/180)),axes=0)
        self.Px = -2 * PI * self.X * np.sin(np.radians(self.scan_angle[0])) * np.cos(np.radians(self.scan_angle[1])) 
        self.Py = -2 * PI * self.Y * np.sin(np.radians(self.scan_angle[0])) * np.sin(np.radians(self.scan_angle[1])) 
        self.P = self.Px + self.Py
        self.I = np.ones(self.P.shape)
        AF =  np.sum(self.I.reshape(-1,1,1) * np.exp(1j * self.P.reshape(-1,1,1)) * np.exp(1j * (2 * PI * XCPST)) * np.exp(1j * (2 * PI * YSPST)),axis=0)

        T = np.tile(theta,(len(phi),1))
        cos_theta = np.cos(np.radians(T))
        cos_theta[T>89] = np.cos(np.radians(89.5))
        
        if self.element_pattern:
            AF = AF * cos_theta

        delta_theta = (self.theta[1] - self.theta[0]) * np.pi / 180
        delta_phi= (phi[1] - phi[0]) * np.pi / 180
            
        AF_int =  np.sum(np.abs(AF)**2 * np.sin(np.radians(T))) * delta_theta * delta_phi / 4 / PI # integral of AF^2
        AF = AF/ (AF_int ** 0.5)
        
        return AF

    def plot_array(self,fig=None,ax=None,colormarker='ob'):
        if not isinstance(fig, matplotlib.figure.Figure):
            fig, ax = plt.subplots(figsize=(8,6))
        if ax:
            plt.sca(ax)
        else:
            ax = fig.add_axes()
        plt.plot(self.X - np.mean(self.X),self.Y - np.mean(self.Y),colormarker)
        # ax = plt.gca()
        # if self.shape in ['rect','tri']:
        #     plt.arrow(self.col[0], self.row[0], 0,self.element_spacing[0], length_includes_head=True,width=.025)
        #     plt.arrow(self.col[0], self.row[0], self.element_spacing[1], 0, length_includes_head=True,width=.025)
        #     plt.text(self.col[0], self.row[0] + self.element_spacing[0]/2,str(self.element_spacing[0]),ha='center',va='center',backgroundcolor='white')
        #     plt.text(self.col[0]+ self.element_spacing[1]/2, self.row[1] ,str(self.element_spacing[1]),ha='center',va='center',backgroundcolor='white')
        plt.xlabel('wavelength')
        plt.ylabel('wavelength')
        plt.title('Array Manifold')
        plt.axis('equal')
        return fig,ax

    def pattern_cut(self,cut_angle):
        cut_angle = cut_angle % 360
        G = db20(self.AF)
        theta_cut = np.hstack((-np.flip(self.theta[1:]), self.theta))
        idx_phi_cut1 = np.argmin(np.abs(self.phi - cut_angle))
        idx_phi_cut2 = np.argmin(np.abs(self.phi - ((180 + cut_angle)%360)))
        return theta_cut , np.hstack((np.flip(G[idx_phi_cut2,1:]), G[idx_phi_cut1,:]) )
        
    
    def calc_peak_sll_hpbw(self,cut_angle):
        '''Function calculates the Peak value and angle, SLL, and HPBW of G in dB
        assuming a pattern with a single peak (no grating lobes)'''
        theta_deg,G = self.pattern_cut(cut_angle)
        ## reducing the theta scope to -90->90 degrees
        idx_m90 = np.argmin(np.abs(theta_deg + 90))
        idx_p90 = np.argmin(np.abs(theta_deg - 90))
        theta_deg = theta_deg[idx_m90:idx_p90+1]
        G = G[idx_m90:idx_p90+1]
        
        peak,idx_peak  = np.max(G), np.argmax(G) 
        theta_peak = theta_deg[idx_peak]
        dG = np.sign(np.diff(G))
        dG_cs = -dG[0:-1] * dG[1:]# change sign in derivative (peaks & nulls)
        dG_cs = np.insert(np.append(dG_cs,1),0,1) 
        cs_idx = np.asarray(dG_cs == 1).nonzero()[0] # idx of peaks and nulls
        idx_ = np.asarray(cs_idx == idx_peak).nonzero()[0][0]
        idx_null_L, idx_null_R= cs_idx[idx_-1],cs_idx[idx_+1]
        try:
            idx_3dB_R = idx_peak + np.argmin(np.abs(G[idx_peak:idx_null_R] - peak + 3))
            idx_3dB_L = idx_null_L + np.argmin(np.abs(G[idx_null_L:idx_peak] - peak + 3))
            HPBW = theta_deg[idx_3dB_R] - theta_deg[idx_3dB_L]    
        except:
            HPBW = -1
        try:
            SLL = peak - np.max([np.max(G[0:idx_null_L]),np.max(G[idx_null_R:])])
        except:
            SLL = -100
        
        pattern_params = namedtuple('pattern_params',['Gain','Peak_Angle','SLL','HPBW'])
        self.pattern_params = pattern_params(float(f'{peak:1.1f}'), float(f'{theta_peak:1.1f}'), float(f'{SLL:1.1f}'), float(f'{HPBW:1.1f}'))
        return self.pattern_params
    
    @staticmethod
    def _plot(x,y,fig=None,ax=None,marker = '-',xlim = None, ylim = None, xlab = 'x',ylab = 'y',title = ''):
        peak_plot = 5 * (int(np.max(y) / 5) + 1)
        if not isinstance(fig, matplotlib.figure.Figure):
            fig, ax = plt.subplots(figsize=(8,6))
        if ax:
            plt.sca(ax)
        # else:
        #     ax = fig.add_axes()
        plt.plot(x,y,marker)
       # ax = plt.gca()
        plt.xlabel(xlab)
        plt.ylabel(ylab)
        plt.title(title)
        if not xlim:
           xlim = (np.min(x),np.max(x))
        if not ylim:
            ylim = ((peak_plot-30,peak_plot))
        
        plt.xlim(xlim)
        plt.ylim(ylim)
        plt.grid(True)
        return  fig, ax

    @staticmethod
    def _polar(t,r,fig=None,ax=None,marker = '-',tlim = None, rlim = None ,title=''):
        peak_plot = 5 * (int(np.max(r) / 5) + 1)
        if isinstance(fig, matplotlib.figure.Figure) and (not isinstance(ax,matplotlib.axes.Axes)):
            if fig.axes:
                ax = fig.axes[0]
            else:
                ax = fig.add_axes([0.1,0.1,0.9,0.9],polar=True)
        elif not isinstance(fig, matplotlib.figure.Figure):
            if isinstance(ax,matplotlib.axes.Axes):
                fig = ax.get_figure()
            else:
                fig, ax = plt.subplots(figsize=(8,6),subplot_kw={'projection': 'polar'})

        ax.plot(np.radians(t), r)
        ax.set_thetagrids(angles=np.linspace(-90,90,13))
        if tlim:
            ax.set_thetamin(tlim[0])
            ax.set_thetamax(tlim[1])
        else:
            ax.set_thetamin(-90)
            ax.set_thetamax(90)
                
        if rlim:
            ax.set_rmax(rlim[1])
            ax.set_rmin(rlim[0])
        else:
            ax.set_rmax(peak_plot)
            ax.set_rmin(peak_plot-30)

        ax.grid(True)
        ax.set_theta_zero_location("N")
        ax.set_rlabel_position(180)  # Move radial labels away from plotted line
        ax.set_theta_direction('clockwise')
            
        return fig,ax
        
    def plot_pattern(self,cut_angle=None,**kwargs):
        if not cut_angle:
            cut_angle = self.scan_angle[1]
        theta_deg,G = self.pattern_cut(cut_angle)
        
        return self._plot(theta_deg,G,**kwargs)
        
    def plot_envelope(self,plot_all=True,**kwargs):
        if plot_all:    
            return self._plot(self.theta,self.envelopes,**kwargs)
        else:
            return self._plot(self.theta,self.envelopes[:,-1 ],**kwargs)

    def polar_pattern(self,cut_angle=None,**kwargs):
        if not cut_angle:
            cut_angle = self.scan_angle[1]
        theta_deg,G = self.pattern_cut(cut_angle)
        return self._polar(theta_deg,G,**kwargs)  
    
    def polar_envelope(self,plot_all=True,**kwargs):
        if plot_all:    
            return self._polar(self.theta,self.envelopes,**kwargs)
        else:
            return self._polar(self.theta,self.envelopes[:,-1 ],**kwargs)
       
    def calc_envelope(self,theta1=0,theta2=45,delta_theta=5):
        N = int((theta2 - theta1)/delta_theta)
        self.scan_range = np.linspace(theta1,theta2,N+1)
        scan_angle_ = self.scan_angle
        self.envelopes = np.zeros((N+1,len(self.theta)))
        for idx,scan_angle in enumerate(self.scan_range):
            self.scan_angle = scan_angle
            self.envelopes[idx,:] = db20(self.calc_AF.ravel())
        self.envelopes[N,:] = np.max(self.envelopes[:-1,:],axis=0)
        self.envelopes = self.envelopes.T
        self.scan_angle = scan_angle_

    def plot_pattern3D(self):
        pass
    
    
    def polar3D(self,**kwargs):
        G =  20 * np.log10(np.abs(self.AF))
        [T,P] = np.meshgrid(self.theta,self.phi)
        max1 = max(np.max(self.X - np.mean(self.X)),np.max(self.Y - np.mean(self.Y)))
        fig, ax = self._polar3D(T,P,G,(self.X - np.mean(self.X))/max1,(self.Y-np.mean(self.Y))/max1,**kwargs)

        
        return fig, ax
    
    def get_3d_polar_data(self, g_range=30):
        """Return 3D polar data for Plotly visualization"""
        G = 20 * np.log10(np.abs(self.AF))
        [T, P] = np.meshgrid(self.theta, self.phi)
        
        peak = np.max(G)
        G = G - peak + g_range
        G[G < (peak - g_range)] = 0
        
        # Convert to Cartesian coordinates
        X = G * np.sin(np.radians(T)) * np.cos(np.radians(P))
        Y = G * np.sin(np.radians(T)) * np.sin(np.radians(P))
        Z = G * np.cos(np.radians(T))
        
        # Normalize array element positions
        max1 = max(np.max(self.X - np.mean(self.X)), np.max(self.Y - np.mean(self.Y)),0.1) # 0.1 to avoid divide by zero in case of a 1x1 array
        array_x = (self.X - np.mean(self.X)) / max1 * g_range / 2
        array_y = (self.Y - np.mean(self.Y)) / max1 * g_range / 2
        
        return {
            'x': X.tolist(),
            'y': Y.tolist(), 
            'z': Z.tolist(),
            'intensity': G.tolist(),
            'array_x': array_x.tolist(),
            'array_y': array_y.tolist(),
            'peak': float(peak),
            'g_range': g_range
        }
    
        
    
    @staticmethod
    def _polar3D(T,P,G,R,C,g_range=30,fig=None,ax=None,title=''):
        
        # if (not isinstance(fig, matplotlib.figure.Figure) and
        #     not isinstance(ax, mpl_toolkits.mplot3d.axes3d.Axes3D)):
        #     fig, ax = plt.subplots(figsize=(8,6),subplot_kw={'projection':'3d'})
        # elif (isinstance(fig, matplotlib.figure.Figure) and
        #      not isinstance(ax, mpl_toolkits.mplot3d.axes3d.Axes3D)):
        #     ax = fig.add_subplot(projection='3d')
        
        if isinstance(fig, matplotlib.figure.Figure) and (not isinstance(ax,mpl_toolkits.mplot3d.axes3d.Axes3D)):
            if fig.axes:
                ax = fig.axes[0]
            else:
                ax = fig.add_axes([0.1,0.1,0.9,0.9],projection='3d')
        elif not isinstance(fig, matplotlib.figure.Figure):
           if isinstance(ax,mpl_toolkits.mplot3d.axes3d.Axes3D):
               fig = ax.get_figure()
           else:
               fig, ax = plt.subplots(figsize=(8,6),subplot_kw={'projection':'3d'})
            
        peak = np.max(G)

        G = G - peak + g_range
        G[G < (peak - g_range)] = 0

        X = G * np.sin(np.radians(T)) * np.cos(np.radians(P))
        Y = G * np.sin(np.radians(T)) * np.sin(np.radians(P))
        Z = G * np.cos(np.radians(T))
        norm = plt.Normalize()

        rat = 1 * g_range
        ax.plot_surface(X,Y,Z,facecolors=plt.cm.jet(norm(G)),rstride=2,cstride=1,alpha=.5)
        ax.plot([-rat,rat],[0,0],'black')
        ax.plot([0,0],[-rat,rat],'black')
        ax.plot([0,0],[0,0],[-rat,rat],'black')
        ax.text(rat,0,0,'x,\nphi=0')
        ax.text(0,rat,0,'y,\nphi=90')
        ax.text(0,0,rat,'z')

        tt = np.linspace(0,360,361) * np.pi / 180
        ax.plot(rat * np.cos(tt),rat * np.sin(tt),'--',color=[0.5,0.5,0.5])
        ax.plot(np.zeros(tt.shape),rat * np.cos(tt),rat * np.sin(tt),'--',color=[0.5,0.5,0.5])
        ax.plot(rat * np.cos(tt),np.zeros(tt.shape),rat * np.sin(tt),'--',color=[0.5,0.5,0.5])

        ax.set_zlim([-rat,rat])
        ax.set_xlim([-rat,rat])
        ax.set_ylim([-rat,rat])
        ax.set_title(title)
        ax.axis('off')
        # ax.plot_wireframe(X,Y,Z,rstride=20,cstride=20)
        ax.view_init(elev=24, azim=25)
        fig.colorbar(cm.ScalarMappable(norm=plt.Normalize(vmin=peak-g_range,vmax=peak), cmap='jet'),shrink=0.5,ax=ax)
        ax.plot(g_range/2 * R,g_range/2*C,'.b')
        # for n in range(C.shape[0]):
        #     ax.plot(g_range/2 * C[n,:],g_range/2 * R[n,:],'.b')
        return fig,ax;
    
    def pattern_contour(self,**kwargs):
        G =  20 * np.log10(np.abs(self.AF))
        # phi -180->180., theta 0->180
        GT =  np.roll(G,int(len(self.phi)/2),axis=0)        
        thetaT = self.theta
        phiT = self.phi - 180
        [TT,PT] = np.meshgrid(thetaT,phiT)
        
        return self._plot_contour(TT,PT,GT,**kwargs);
    
    def get_contour_data(self, g_range=30):
        """Return contour data for Plotly visualization"""
        G = 20 * np.log10(np.abs(self.AF))
        
        # Transform data for full theta/phi range
        G11 = np.flip(np.roll(G[1:,1:],int(len(self.phi)/2),axis=0))
        G12 = np.flip(G[1:,:],axis=0)
        G21 = np.flip(np.roll(G[:,1:],int(len(self.phi)/2),axis=0),axis=1)
        G22 = G
        GT = np.vstack((np.hstack((G11,G12)),np.hstack((G21,G22))))
        
        thetaT = np.hstack((-np.flip(self.theta[1:]), self.theta))
        phiT = np.hstack((-np.flip(self.phi[1:]), self.phi))
        [TT,PT] = np.meshgrid(thetaT,phiT)
        
        peak = np.max(GT)
        GT[GT < (peak - g_range)] = peak - g_range
        
        return {
            'theta': TT.tolist(),
            'phi': PT.tolist(),
            'intensity': GT.tolist(),
            'peak': float(peak),
            'g_range': g_range
        }
        
    @staticmethod
    def _plot_contour(T,P,G,g_range=30,fig=None,ax=None,tlim = [0,180], plim = [-180,180],tlab=r'$\theta$',plab=r'$\phi$',title=''):
        
        if isinstance(fig, matplotlib.figure.Figure) and (not isinstance(ax,matplotlib.axes.Axes)):
            if fig.axes:
                ax = fig.axes[0]
            else:
                ax = fig.add_axes([0.1,0.1,0.9,0.9]);
        elif not isinstance(fig, matplotlib.figure.Figure):
            if isinstance(ax,matplotlib.axes.Axes):
                fig = ax.get_figure();
            else:
                fig, ax = plt.subplots(figsize=(8,6))
        
            
        peak = np.max(G)
        G[G < (peak - g_range)] = peak - g_range
        plt.sca(ax)
        plt.contourf(P,T,G,cmap='hot')
        plt.colorbar()
        plt.clim([peak-g_range,peak])
        plt.xlabel(plab);
        plt.ylabel(tlab);
        plt.ylim(tlim);
        plt.xlim(plim);
        plt.title(title);
        
        return fig,ax;

    def polarsurf(self,g_range=30,fig=None,ax=None,title='Polar Surf'):
        
        if isinstance(fig, matplotlib.figure.Figure) and (not isinstance(ax,matplotlib.axes.Axes)):
            if fig.axes:
                ax = fig.axes[0]
            else:
                ax = fig.add_axes([0.1,0.1,0.9,0.9]);
        elif not isinstance(fig, matplotlib.figure.Figure):
            if isinstance(ax,matplotlib.axes.Axes):
                fig = ax.get_figure();
            else:
                fig, ax = plt.subplots(figsize=(8,6))
                
        plt.sca(ax)
        # if not isinstance(fig, matplotlib.figure.Figure):
        #     fig, ax = plt.subplots(figsize=(8,6))
        # else:
        #     ax = fig.add_axes([0, 0, 1.6, 1.2], polar=True)

        G =  20 * np.log10(np.abs(self.AF))
        [T,P] = np.meshgrid(self.theta,self.phi)
        peak = np.max(G)
        X = np.sin(np.radians(T)) * np.cos(np.radians(P))

        Y = np.sin(np.radians(T)) * np.sin(np.radians(P))
        G[G < (peak - g_range)] = peak - g_range -1

        for p in np.linspace(0,330,12) * np.pi / 180:
            plt.plot([0, np.cos(p)],[0, np.sin(p)],'--',color=[0.5,0.5,0.5],alpha=0.5)
            plt.text(1.07 * np.cos(p),1.07 * np.sin(p),f'{(p*180/np.pi):1.0f}')
        tt = np.linspace(0,360,361) * np.pi / 180

        for t in np.linspace(0,90,4) * np.pi / 180:
            plt.plot(np.sin(t) * np.cos(tt), np.sin(t) * np.sin(tt),'--',color=[0.5,0.5,0.5],alpha=0.5)
            if t <=np.pi/3:
                plt.text(np.sin(t),0.05,f'{(t*180/np.pi):1.0f}')

        plt.axis('equal')
        plt.axis('off')
        CS3 = plt.contourf(X,Y,G,30,cmap=cm.jet,extend='min',vmin=peak-g_range,vmax=peak)
        # CS3.cmap.set_under('blue')

        plt.colorbar()
        plt.clim([peak-g_range,peak])
        plt.title(title)
        plt.text(np.cos(np.pi/20),np.sin(np.pi/20),' phi')
        plt.plot(np.cos(np.pi/18),np.sin(np.pi/18),'^',color='black')
        return fig,ax;
    
    def get_polar_surface_data(self, g_range=30):
        """Return polar surface data for Plotly visualization"""
        G = 20 * np.log10(np.abs(self.AF))
        [T, P] = np.meshgrid(self.theta, self.phi)
        peak = np.max(G)
        
        # Convert to polar coordinates
        X = np.sin(np.radians(T)) * np.cos(np.radians(P))
        Y = np.sin(np.radians(T)) * np.sin(np.radians(P))
        
        G[G < (peak - g_range)] = peak - g_range - 1
        
        return {
            'x': X.tolist(),
            'y': Y.tolist(),
            'intensity': G.tolist(),
            'peak': float(peak),
            'g_range': g_range
        }
    def polarsphere(self,g_range=30,fig=None,ax=None):
        
        # if not isinstance(fig, matplotlib.figure.Figure):
        #     fig, ax = plt.subplots(figsize=(8,6),subplot_kw={'projection':'3d'})
        # else:
        #     ax = fig.add_subplot(projection='3d')
        
        if isinstance(fig, matplotlib.figure.Figure) and (not isinstance(ax,mpl_toolkits.mplot3d.axes3d.Axes3D)):
            if fig.axes:
                ax = fig.axes[0]
            else:
                ax = fig.add_axes([0.1,0.1,0.9,0.9],projection='3d')
        elif not isinstance(fig, matplotlib.figure.Figure):
           if isinstance(ax,mpl_toolkits.mplot3d.axes3d.Axes3D):
               fig = ax.get_figure()
           else:
               fig, ax = plt.subplots(figsize=(8,6),subplot_kw={'projection':'3d'})
        plt.sca(ax)    
        [T,P] = np.meshgrid(self.theta,self.phi)
        G =  20 * np.log10(np.abs(self.calc_AF))
        peak = np.max(G)
        r_range = 30
        G[G < (peak - g_range)] = peak - g_range
        norm = plt.Normalize()

        X = np.sin(np.radians(T)) * np.cos(np.radians(P))
        Y = np.sin(np.radians(T)) * np.sin(np.radians(P))
        Z = np.cos(np.radians(T))

        ax.plot_surface(X,Y,Z,facecolors=plt.cm.jet(norm(G)),rstride=2,cstride=1,alpha=.7)
        ax.axis('off')
        rat = 1.25
        # ax.view_init(elev=90, azim=-90)
        ax.plot([0,rat],[0,0],'black')
        ax.plot([0,0],[0,rat],'black')
        ax.plot([0,0],[0,0],[0,rat],'black')
        ax.text(rat,0,0,'x',color='red')
        ax.text(0,rat,0,'y',color='red')
        ax.text(0,0,rat,'z',color='red')
        ax.view_init(elev=24, azim=25)
        fig.colorbar(cm.ScalarMappable(norm=plt.Normalize(vmin=peak-r_range,vmax=peak), cmap='jet'),shrink=0.5,ax=ax)