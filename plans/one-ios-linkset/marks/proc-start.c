#include <sys/sysctl.h>
#include <sys/types.h>
#include <stdio.h>
#include <stdlib.h>
int main(int argc, char **argv) { struct kinfo_proc p; size_t n=sizeof(p); int mib[]={CTL_KERN,KERN_PROC,KERN_PROC_PID,atoi(argv[1])}; if(sysctl(mib,4,&p,&n,0,0)||!n)return 1; printf("%.3f\n",p.kp_proc.p_un.__p_starttime.tv_sec*1000.0+p.kp_proc.p_un.__p_starttime.tv_usec/1000.0); }
