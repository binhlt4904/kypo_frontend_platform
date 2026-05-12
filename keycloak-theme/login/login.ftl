<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        ${msg("doLogIn")}
    <#elseif section = "form">
        <form id="kc-form-login"
              onsubmit="login.disabled = true; return true;"
              action="${url.loginAction}"
              method="post">

            <div class="form-group">
                <label for="username">
                    <#if !realm.loginWithEmailAllowed>${msg("username")}
                    <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
                    <#else>${msg("email")}</#if>
                </label>
                <input tabindex="1"
                       id="username"
                       class="pf-c-form-control"
                       name="username"
                       value="${(login.username!'')}"
                       type="text"
                       autofocus
                       autocomplete="off"/>
            </div>

            <div class="form-group">
                <label for="password">${msg("password")}</label>
                <div class="pf-c-input-group">
                    <input tabindex="2"
                           id="password"
                           class="pf-c-form-control"
                           name="password"
                           type="password"
                           autocomplete="current-password"/>
                    <button class="pf-c-button pf-m-control"
                            type="button"
                            aria-label="${msg('showPassword')}"
                            onclick="var p=document.getElementById('password');p.type=p.type==='password'?'text':'password'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="form-group">
                <input tabindex="4"
                       class="pf-c-button pf-m-primary pf-m-block"
                       name="login"
                       id="kc-login"
                       type="submit"
                       value="${msg('doLogIn')}"/>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>